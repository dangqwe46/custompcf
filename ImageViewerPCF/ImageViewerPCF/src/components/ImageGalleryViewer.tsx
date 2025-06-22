import * as React from "react";
import ImageGallery from "react-image-gallery";
import { imageViewerData } from "../types/imageViewer";

interface ImageGalleryViewerProps {
  images: imageViewerData[];
  onSlideChange?: (index: number) => void;
  isMobile: boolean;
}

/**
 * A reusable image gallery viewer component
 */
export const ImageGalleryViewer: React.FC<ImageGalleryViewerProps> = ({
  images,
  onSlideChange,
  isMobile
}) => {
  if (images.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "#666",
          fontSize: "16px",
          fontWeight: 500,
        }}
      >
        No images available
      </div>
    );
  }

  return (
    <ImageGallery
      items={images}
      lazyLoad={false}
      showThumbnails={false}
      showFullscreenButton={false}
      useBrowserFullscreen={false}
      showPlayButton={false}
      showBullets={true}
      showIndex={true}
      infinite={true}
      slideDuration={200}
      slideInterval={500}
      onSlide={onSlideChange}
      additionalClass={isMobile ? "mobile-gallery" : ""}
    />
  );
}; 