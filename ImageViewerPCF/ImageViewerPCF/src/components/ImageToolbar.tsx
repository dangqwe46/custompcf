import * as React from "react";
import { IconButton } from "@fluentui/react";

interface ImageToolbarProps {
  currentUIState: string;
  isMobile: boolean;
  onDownload: () => void;
  onUpload: () => void;
  onCapture: () => void;
  onDelete: () => void;
}

/**
 * A reusable toolbar component for image actions
 */
export const ImageToolbar: React.FC<ImageToolbarProps> = ({
  currentUIState,
  isMobile,
  onDownload,
  onUpload,
  onCapture,
  onDelete,
}) => {
  if (!["viewer", "dropImage"].includes(currentUIState)) {
    return null;
  }

  return (
    <div>
      {currentUIState !== "dropImage" && currentUIState === "viewer" /*&& !isMobile*/ && (
        <IconButton
          iconProps={{
            iconName: "Download",
            styles: { root: { color: "black", zIndex: 1000 } },
          }}
          onClick={onDownload}
          title="Download"
          ariaLabel="Download"
        />
      )}

      <IconButton
        iconProps={{
          iconName: "Upload",
          styles: { root: { color: "black", zIndex: 1000 } },
        }}
        onClick={onUpload}
        title="Upload"
        ariaLabel="Upload"
      />

      {isMobile && (
        <IconButton
          iconProps={{
            iconName: "Camera",
            styles: { root: { color: "black", zIndex: 1000, fontSize: "20px" } },
          }}
          onClick={onCapture}
          title="Take Photo"
          ariaLabel="Take Photo"
          styles={{
            root: {
              marginLeft: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              padding: '6px'
            },
            rootHovered: {
              backgroundColor: '#e0e0e0',
            }
          }}
        />
      )}

      {currentUIState !== "dropImage" && currentUIState === "viewer" && (
        <IconButton
          iconProps={{
            iconName: "Delete",
            styles: { root: { color: "black", zIndex: 1000 } },
          }}
          onClick={onDelete}
          title="Delete"
          ariaLabel="Delete"
        />
      )}
    </div>
  );
}; 