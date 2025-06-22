import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { IInputs } from './generated/ManifestTypes';
// ReactImageVideoViewer no longer needed
// import ReactImageVideoViewer from 'react-image-video-viewer';
import { 
  LogsViewer, 
  UploadControls, 
  VideoGallery, 
  LoadingOverlay,
  LoggingProvider, 
  useLogging,
  Annotation 
} from './components';
import { AnnotationService, EntityReference } from './services/AnnotationService';

// Component props interface
interface ReactAttachmentVideoProps {
  entityReference: EntityReference;
  context: ComponentFramework.Context<IInputs>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  defectTempId?: string;
  debugMode?: boolean;
}

const ReactAttachmentVideoControlInner: React.FC<ReactAttachmentVideoProps> = (props) => {
  // State variables
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videos, setVideos] = useState<Annotation[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // const [defectTempId, setDefectTempId] = useState<string>('');
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  
  
  // Logging context
  const { logs, addLog, clearLogs, copyLogs } = useLogging();
  
  // Annotation service
  const annotationService = React.useMemo(() => new AnnotationService(props.context), [props.context]);
  
  // Constants
  const MAX_VIDEOS = 2;
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const SUPPORTED_FORMATS = ['video/mp4','video/quicktime','video/mov'];

  // // // Generate a GUID for temp ID if needed
  // useEffect(() => {
  //     setDefectTempId(props.defectTempId || '');
  // }, [props.defectTempId]);
  const defectTempId = props.defectTempId || '';
  
  
  // Detect if running on mobile device
  useEffect(() => {
    detectMobileDevice();
  }, []);
  
  // Setup network detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Re-sync data when coming back online
      fetchExistingVideos();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      props.onError('You are offline.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [props.entityReference]);
  
  // Fetch existing videos on component mount or when entityReference changes
  useEffect(() => {
    fetchExistingVideos();
  }, [props.entityReference]);
  
  // Detect if running on a mobile device
  const detectMobileDevice = () => {
    // First check client API if available
    if (props.context && props.context.client && 'getFormFactor' in props.context.client) {
      // Type for client with getFormFactor
      interface ClientWithFormFactor {
        getFormFactor: () => number;
      }
      
      const formFactor = ((props.context.client as unknown) as ClientWithFormFactor).getFormFactor();
      if (formFactor === 2) { // 2 = phone
        setIsMobileDevice(true);
        return;
      }
    }
    
    // Fallback to user agent detection
    const userAgent = navigator.userAgent || navigator.vendor || 
      ((window as unknown) as {opera: string}).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobileDevice(mobileRegex.test(userAgent.toLowerCase()));
  };
  
  // Generate a GUID
  const generateGuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // Helper to fetch existing video attachments
  const fetchExistingVideos = async () => {
    setIsLoading(true);
    
    try {
      if (props.debugMode) {
        addLog('info', 'Fetching existing videos...');
        addLog('info', `Entity reference: ${JSON.stringify(props.entityReference)}`);
      }
      
      let videoAnnotations: Annotation[] | null = [];
      
      // Different query based on whether we have an entity ID or not
      if (props.entityReference && props.entityReference.entityId && props.entityReference.entityId !== "00000000-0000-0000-0000-000000000000") {
        // Case 1 & 3: Form is saved, has recordId
        videoAnnotations = await annotationService.fetchVideosByEntityId(props.entityReference);
      } else {
        // Case 2 & 4: Form is not saved, use defectTempId
        videoAnnotations = await annotationService.fetchVideosByTempId(defectTempId);
      }
      
      setVideos(videoAnnotations || []);
      
      if (props.debugMode) {
        addLog('info', `Total videos loaded: ${videoAnnotations?.length || 0}`);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      props.onError('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Record video using device camera
  const recordVideo = async () => {
    if (!isMobileDevice) return;
    
    try {
      setIsLoading(true);
      setUploadError(null);
      
      // Debug logging
      if (props.debugMode) {
        addLog('info', 'Attempting to record video using Device.captureVideo');
      }
      
      // Use PCF API to capture video
      const videoFile = await props.context.device.captureVideo();
      if (!videoFile) {
        // User cancelled or failed to record
        setIsLoading(false);
        if (props.debugMode) {
          addLog('info', 'Video recording cancelled or failed');
        }
        return;
      }
      
      // Debug logging
      if (props.debugMode) {
        addLog('info', `Video recorded successfully: ${videoFile.fileName}, Size: ${videoFile.fileSize}`);
      }
      
      // Check file size
      if (videoFile.fileSize > MAX_FILE_SIZE) {
        setUploadError(`Error: Video size exceeds the maximum limit of 50MB.`);
        setIsLoading(false);
        return;
      }
      
      // Check if we already have maximum videos
      if (videos.length >= MAX_VIDEOS) {
        setUploadError(`You can only upload up to ${MAX_VIDEOS} videos. Please delete an existing video first.`);
        setIsLoading(false);
        return;
      }
      
      // Process the recorded video
      const processedVideo = await processVideo(videoFile.fileContent, videoFile.fileName);
      
      // Process the captured video
      const notesEntity = annotationService.createAnnotationEntity(
        processedVideo.name,
        processedVideo.data,
        processedVideo.type,
        videoFile.fileSize,
        props.entityReference,
        defectTempId
      );
      
      // Always create a new annotation rather than updating
      await annotationService.createAnnotation(notesEntity);
      props.onSuccess("Video recorded successfully!");
      
      // Refresh the list after changes
      await fetchExistingVideos();
    } catch (error) {
      console.error("Error recording video:", error);
      if (props.debugMode) {
        addLog('error', `Detailed error: ${JSON.stringify(error)}`);
      }
      props.onError("Failed to record video");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Convert file to base64
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Process video convert to MP4
  const processVideo = async (videoData: Blob | string, fileName: string): Promise<{ data: string, type: string, name: string }> => {
          // Return original video data if processing fails
          if (typeof videoData === 'string') {
            return { 
              data: videoData,
              type: 'video/mp4',
              name: fileName.replace(/\.[^/.]+$/, '') + '.mp4'
            };
          } else {
            // Convert Blob to base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(videoData);
            });
            return { 
              data: base64Data.split(',')[1], // Remove data URI prefix
              type: 'video/mp4',
              name: fileName.replace(/\.[^/.]+$/, '') + '.mp4'
            };
          }
  };
  
  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Error: Video size exceeds the maximum limit of 50MB.`);
      return;
    }
    
    // Check file format
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setUploadError(`Error: Unsupported video format. Please upload MP4 or MOV videos only.`);
      return;
    }
    
    // Check if we already have maximum videos
    if (videos.length >= MAX_VIDEOS) {
      setUploadError(`You can only upload up to ${MAX_VIDEOS} videos. Please delete an existing video first.`);
      return;
    }
    
    setIsLoading(true);
    setUploadError(null);
    
    try {
      // Process video
      const processedVideo = await processVideo(file, file.name);
      
      // Create annotation entity
      const notesEntity = annotationService.createAnnotationEntity(
        processedVideo.name, 
        processedVideo.data, 
        processedVideo.type, 
        file.size, 
        props.entityReference, 
        defectTempId
      );
      
      // Always create a new annotation rather than updating
      await annotationService.createAnnotation(notesEntity);
      props.onSuccess("Video uploaded successfully!");
      
      // Clear the file input
      event.target.value = '';
      
      // Refresh the list after changes
      await fetchExistingVideos();
    } catch (error) {
      console.error("Error uploading video:", error);
      props.onError("Failed to upload video");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a video
  const deleteVideo = async (annotationId: string) => {
    if (!annotationId) return;
    
    setIsLoading(true);
    
    try {
      await annotationService.deleteAnnotation(annotationId);
      props.onSuccess("Video deleted successfully!");
      
      // Update videos list
      setVideos(prevVideos => prevVideos.filter(video => video.annotationid !== annotationId));
    } catch (error) {
      console.error("Error deleting video:", error);
      props.onError("Failed to delete video");
    } finally {
      setIsLoading(false);
    }
  };

  // Format videos for the react-image-video-viewer - still used for reference
  const formatVideosForViewer = () => {
    return videos.map(video => {
      const base64Content = `data:${video.mimetype};base64,${video.documentbody}`;
      return {
        url: base64Content,
        type: "video",
        title: video.filename,
      };
    });
  };
  
  // Toggle logs visibility
  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  return (
    <div className="react-attachment-video-uploadcontrol">
      {/* Upload controls */}
      <UploadControls 
        isLoading={isLoading}
        isMobileDevice={isMobileDevice}
        videoCount={videos.length}
        maxVideos={MAX_VIDEOS}
        uploadError={uploadError}
        onFileChange={handleFileChange}
        onRecordVideo={recordVideo}
        onDeleteVideo={deleteVideo}
        videos={videos}
      />
    <div className="react-attachment-video-control">
      {/* Debug controls and logs */}
      {props.debugMode && (
        <LogsViewer 
          logs={logs}
          onClearLogs={clearLogs}
          onCopyLogs={copyLogs}
          onToggleLogs={toggleLogs}
          showLogs={showLogs}
        />
      )}
      

      
      {/* Video Player */}
      <div className="video-player-container">
        {videos.map((video, index) => (
          <div key={video.annotationid} className="video-player-item">
            <div className="video-title">{video.filename}</div>
            <video
              controls
              width="100%"
              src={`data:${video.mimetype};base64,${video.documentbody}`}
              className="video-player"
              controlsList="nodownload nofullscreen"
              preload="metadata"
            />
          </div>
        ))}
        {videos.length === 0 && (
          <div className="no-videos-message">No videos available</div>
        )}
      </div>
      
      {/* Loading indicator */}
      <LoadingOverlay isLoading={isLoading} />

      <style>
        {`
        .react-attachment-video-control {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 0px;
        }
        .react-attachment-video-uploadcontrol {
          margin: 0 auto;
          padding: 0px;    
        }
        
        /* Debug controls and logs viewer */
        .debug-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          padding: 8px;
          background-color: #f1f1f1;
          border-radius: 4px;
        }
        
        .debug-btn {
          background-color: #333;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .toggle-logs-btn {
          background-color: #0078d4;
        }
        
        .clear-logs-btn {
          background-color: #d83b01;
        }
        
        .copy-logs-btn {
          background-color: #107c10;
        }
        
        .logs-viewer {
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .logs-container {
          height: 200px;
          overflow-y: auto;
          background-color: #2d2d2d;
          color: #e0e0e0;
          font-family: Consolas, Monaco, 'Andale Mono', monospace;
          font-size: 12px;
          padding: 8px;
          white-space: pre-wrap;
          word-break: break-all;
        }
        
        .log-entry {
          margin: 2px 0;
          line-height: 1.4;
        }
        
        .log-timestamp {
          color: #75bfff;
          margin-right: 5px;
        }
        
        .log-level {
          margin-right: 5px;
        }
        
        .log-info .log-level {
          color: #3ad900;
        }
        
        .log-error .log-level {
          color: #ff5252;
        }
        
        .log-warn .log-level {
          color: #ffb224;
        }
        
        .log-message {
          color: #e0e0e0;
        }
        
        /* Upload section */
        .upload-section {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .upload-btn, .record-btn {
          background-color: #0078d4;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .upload-btn:hover, .record-btn:hover {
          background-color: #106ebe;
        }
        
        .upload-btn:disabled, .record-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .btn-icon {
          margin-right: 4px;
          font-size: 16px;
        }
        
        .delete-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
          width: 100%;
        }
        
        .video-item-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
        }
        
        .video-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 10px;
        }
        
        .play-button {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .delete-video-btn {
          background-color: #d9534f;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.3s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .delete-video-btn:hover {
          background-color: #c9302c;
        }
        
        .camera-icon {
          margin-right: 4px;
          font-size: 16px;
        }
        
        .error-message {
          color: #e74c3c;
          background-color: #fadbd8;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .gallery-info {
          margin: 10px 0;
          font-size: 14px;
          color: #666;
        }
        
        .gallery-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        
        .gallery-item {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          background-color: #f5f5f5;
        }
        
        .video-thumbnail {
          position: relative;
          width: 100%;
          height: 0;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          background-color: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }
        
        .thumbnail-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.2);
          transition: background-color 0.3s;
        }
        
        .thumbnail-overlay:hover {
          background-color: rgba(0, 0, 0, 0.4);
        }
        
        .play-icon {
          font-size: 32px;
          color: white;
          opacity: 0.8;
        }
        
        .video-info {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .video-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70%;
          font-size: 14px;
        }
        
        .delete-btn {
          background-color: #d9534f;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .delete-btn:hover {
          background-color: #c9302c;
        }
        
        /* New styles for video controls */
        .video-controls {
          padding: 8px;
          background-color: #f5f5f5;
          display: flex;
          justify-content: flex-end;
        }
        
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        
        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0078d4;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }
        
        .loading-text {
          color: #333;
          font-size: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* New Video Player Styles - Vertical Layout */
        .video-player-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 20px;
          width: 100%;
          max-width: 100%;
        }

        .video-player-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f9f9f9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .video-title {
          padding: 12px 15px;
          font-weight: 500;
          background-color: #f1f1f1;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .video-player {
          width: 100%;
          background-color: #000;
        }

        .no-videos-message {
          padding: 20px;
          text-align: center;
          background-color: #f5f5f5;
          border-radius: 8px;
          color: #666;
          font-style: italic;
        }
        
        @media (max-width: 600px) {
          .gallery-container {
            grid-template-columns: 1fr;
          }
          
          .upload-btn, .record-btn {
            padding: 10px 16px;
            font-size: 16px;
            flex: 1;
            justify-content: center;
          }
        }
        `}
      </style>
    </div>
    </div>
  );
};

// Wrap the component with the LoggingProvider
const ReactAttachmentVideoControl: React.FC<ReactAttachmentVideoProps> = (props) => {
  return (
    <LoggingProvider debugMode={props.debugMode || false}>
      <ReactAttachmentVideoControlInner {...props} />
    </LoggingProvider>
  );
};

// Add styles to document head
const styleElement = document.createElement('style');
styleElement.textContent = `
  /* Video player styles */
  body.no-scroll {
    overflow: hidden;
  }
`;
document.head.appendChild(styleElement);

export default ReactAttachmentVideoControl; 