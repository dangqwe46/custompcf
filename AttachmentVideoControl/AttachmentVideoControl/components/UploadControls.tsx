import * as React from 'react';
import { useRef } from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { Annotation } from './VideoGallery';

interface UploadControlsProps {
  isLoading: boolean;
  isMobileDevice: boolean;
  videoCount: number;
  maxVideos: number;
  uploadError: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRecordVideo: () => void;
  onDeleteVideo?: (annotationId: string) => void;
  videos?: Annotation[];
}

const UploadControls: React.FC<UploadControlsProps> = ({
  isLoading,
  isMobileDevice,
  videoCount,
  maxVideos,
  uploadError,
  onFileChange,
  onRecordVideo,
  onDeleteVideo,
  videos = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDeleteVideo = (annotationId: string) => {
    if (!onDeleteVideo) return;
    
    if (confirm("Are you sure you want to delete this video?")) {
      onDeleteVideo(annotationId);
    }
  };
  
  const isDisabled = isLoading || videoCount >= maxVideos;
  
  return (
    <div className="upload-section">
      <input
        ref={fileInputRef}
        type="file"
        id="videoUpload"
        accept="video/mp4,video/mov,video/quicktime"
        onChange={onFileChange}
        disabled={isDisabled}
        style={{ display: 'none' }}
      />
      <div className="button-group">
        <IconButton
          iconProps={{
            iconName: "Upload",
            styles: { root: { color: "black", zIndex: 1000 } },
          }}
          onClick={handleUploadClick}
          disabled={isDisabled}
          title="Upload Video"
          ariaLabel="Upload Video"
          text={isLoading ? 'Uploading...' : 'Upload Video'}
        />
        
        {isMobileDevice && (
          <IconButton
            iconProps={{
              iconName: "Video",
              styles: { root: { color: "black", zIndex: 1000 } },
            }}
            onClick={onRecordVideo}
            disabled={isDisabled}
            title="Record Video"
            ariaLabel="Record Video"
            text="Record Video"
          />
        )}
      </div>
      
      {uploadError && (
        <div className="error-message">{uploadError}</div>
      )}
      
      <div className="gallery-info">
        {videoCount === 0 ? (
          <p>No videos uploaded. You can upload up to {maxVideos} videos.</p>
        ) : (
          <p>Videos: {videoCount}/{maxVideos}</p>
        )}
      </div>
      
      {videoCount > 0 && (
        <div className="delete-controls">
          {videos.map((video) => (
            <div key={video.annotationid} className="video-item-control">
              <span className="video-name">{video.filename}</span>
              <IconButton
                iconProps={{
                  iconName: "Delete",
                  styles: { root: { color: "#d9534f", zIndex: 1000 } },
                }}
                onClick={() => handleDeleteVideo(video.annotationid)}
                title="Delete Video"
                ariaLabel="Delete Video"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadControls; 