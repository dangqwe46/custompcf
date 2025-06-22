import * as React from 'react';
// Import Fluent UI icon components - NOTE: You need to install @fluentui/react package
// NOTE: Run "npm install @fluentui/react" to install Fluent UI
import { IconButton } from '@fluentui/react/lib/Button';

// Annotation (attachment) type
export interface Annotation {
  annotationid: string;
  filename: string;
  mimetype: string;
  documentbody: string;
  notetext: string;
  filesize: number;
  objectid: string;
}

interface VideoGalleryProps {
  videos: Annotation[];
  onVideoClick: (index: number) => void;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({
  videos,
  onVideoClick
}) => {
  if (videos.length === 0) {
    return null;
  }
  
  return (
    <div className="gallery-container">
      {videos.map((video, index) => (
        <div className="gallery-item" key={video.annotationid}>
          <div 
            className="video-thumbnail"
            onClick={() => onVideoClick(index)}
          >
            <div className="thumbnail-overlay">
              <IconButton
                iconProps={{
                  iconName: "Play",
                  styles: { root: { color: "white", fontSize: 32, zIndex: 1000 } },
                }}
                className="play-button"
                title="Play Video"
                ariaLabel="Play Video"
              />
            </div>
            <div className="video-info">
              <div className="video-title">{video.filename}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGallery; 