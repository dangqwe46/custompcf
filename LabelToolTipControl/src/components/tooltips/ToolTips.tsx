import * as React from "react";
import {
  Label,
  makeStyles,
  mergeClasses,
  tokens,
  Tooltip,
  useId,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogContent,
  DialogTitle,
  Button,
} from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";
import type { TooltipProps } from "@fluentui/react-components";
import { IInputs } from "../../../LabelToolTipControl/generated/ManifestTypes";
import { useState, useRef, useEffect } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    columnGap: tokens.spacingVerticalS,
    alignItems: "center",
  },
  visible: {
    color: tokens.colorNeutralForeground2BrandSelected,
  },
  clickable: {
    cursor: "pointer",
  },
  tooltipContent: {
    maxWidth: "250px",
    fontSize: tokens.fontSizeBase200,
    padding: tokens.spacingHorizontalS,
    wordBreak: "break-word",
  },
  responsiveIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "manipulation", // Better touch handling
  },
  requiredIndicator: {
    color: tokens.colorPaletteRedForeground1,
    marginRight: "4px",
    fontWeight: "bold",
  },
  labelContainer: {
    display: "flex",
    alignItems: "center",
  },
  // Special styles for aircraft registration popup
  aircraftPopup: {
    maxWidth: "600px",
    width: "100%",
  },
  imagesContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: tokens.spacingVerticalM,
    flexWrap: "nowrap",
    gap: "5px", // Reduce the gap between images
    width: "100%",
    overflow: "hidden",
  },
  imageWrapper: {
    flex: "0 0 auto",
    minWidth: "125px",
    marginBottom: tokens.spacingVerticalS,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  popupImage: {
    width: "100%",
    height: "100%",
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  descriptionText: {
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    marginBottom: tokens.spacingVerticalL,
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
  }
});

export const ToolTips = (props:{
    context:ComponentFramework.Context<IInputs>,
    content:Partial<TooltipProps>
} ) => {
  const styles = useStyles();
  const contentId = useId("content");
  const [visible, setVisible] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAircraftDialogOpen, setIsAircraftDialogOpen] = useState(false);
  
  // Check if this is the aircraft registration field
  const isAircraftRegistrationField = 
     props.context.parameters.FieldLogicalName.raw === "o365m_aircraftregistrationnumber";
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Handle clicks outside to close the tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };
    
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);

  const handleToggle = () => {
    // For aircraft registration field, open the dialog instead of the tooltip
    if (isAircraftRegistrationField) {
      setIsAircraftDialogOpen(true);
    } else {
      setVisible(!visible);
    }
  };

  // Aircraft Registration Special Dialog
  const renderAircraftRegistrationDialog = () => {
    const image1Base64 = props.context.parameters.Image1Base64?.raw || '';
    const image2Base64 = props.context.parameters.Image2Base64?.raw || '';
    const tooltipContent = props.context.parameters.TooltipsContent.raw || '';
    
    return (
      <Dialog 
        open={isAircraftDialogOpen} 
        onOpenChange={(e, data) => setIsAircraftDialogOpen(data.open)}
      >
        <DialogSurface className={styles.aircraftPopup}>
          <DialogBody>
            <DialogTitle>Aircraft Registration Number</DialogTitle>
            <DialogContent>
              <div className={styles.imagesContainer}>
                {image1Base64 && (
                  <div className={styles.imageWrapper}>
                    <img 
                      src={image1Base64} 
                      alt="Aircraft Registration Location Example 1" 
                      className={styles.popupImage}
                    />
                  </div>
                )}
                {image2Base64 && (
                  <div className={styles.imageWrapper}>
                    <img 
                      src={image2Base64} 
                      alt="Aircraft Registration Location Example 2" 
                      className={styles.popupImage}
                    />
                  </div>
                )}
              </div>
              <div className={styles.descriptionText}>
                {tooltipContent}
              </div>
              <div className={styles.buttonContainer}>
                <Button
                  appearance="primary"
                  onClick={() => setIsAircraftDialogOpen(false)}
                >
                  OKAY
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  };

  return (
    <div aria-owns={visible ? contentId : undefined} className={styles.root}>
      <div className={styles.labelContainer}>
        <Label>{props.context.parameters.FieldLabel.raw}</Label>
        {props.context.parameters.isRequired.raw && <span className={styles.requiredIndicator}>*</span>}
      </div>
      {/* For aircraft registration field, use a special dialog */}
      {isAircraftRegistrationField ? (
        <>
          <span ref={iconRef} className={styles.responsiveIcon}>
            <Info16Regular
              tabIndex={0}
              className={mergeClasses(
                styles.clickable,
                isAircraftDialogOpen && styles.visible
              )}
              onClick={handleToggle}
            />
          </span>
          {renderAircraftRegistrationDialog()}
        </>
      ) : (
        // For all other fields, use the standard tooltip/popover
        isMobile ? (
          <Popover 
            open={visible}
            onOpenChange={(e, data) => setVisible(data.open)}
            positioning={{
              position: 'above',
              align: 'center',
              fallbackPositions: ['below', 'after', 'before']
            }}
          >
            <PopoverTrigger disableButtonEnhancement>
              <span ref={iconRef} className={styles.responsiveIcon}>
                <Info16Regular
                  tabIndex={0}
                  className={mergeClasses(
                    styles.clickable,
                    visible && styles.visible
                  )}
                  onClick={handleToggle}
                />
              </span>
            </PopoverTrigger>
            <PopoverSurface>
              <div className={styles.tooltipContent}>
                {props.context.parameters.TooltipsContent.raw}
              </div>
            </PopoverSurface>
          </Popover>
        ) : (
          // For desktop, use Tooltip with dynamic positioning
          <Tooltip
            content={{
              children: (
                <div className={styles.tooltipContent}>
                  {props.context.parameters.TooltipsContent.raw}
                </div>
              ),
              id: contentId,
            }}
            positioning={{
              position: 'above',
              align: 'center',
              fallbackPositions: ['below', 'after', 'before'],
            }}
            withArrow
            relationship="label"
            visible={visible}
            onVisibleChange={(e, data) => {
              if (e?.type !== "click") {
                return;
              }
              setVisible(data.visible);
            }}
            {...props.content}
          >
            <span ref={iconRef} className={styles.responsiveIcon}>
              <Info16Regular
                tabIndex={0}
                className={mergeClasses(
                  styles.clickable,
                  visible && styles.visible
                )}
                onClick={handleToggle}
              />
            </span>
          </Tooltip>
        )
      )}
    </div>
  );
};
