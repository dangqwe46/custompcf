import { imageRawData } from '../types/imageViewer'

/**
 * Read image data from the base64Stored field
 * @param base64Stored JSON string containing the image data
 * @param setCurrentUIState for updating the UI state
 * @param setImageRawData for updating the imageRawData state
 */

export const getFileContent = (base64Stored: string,
    setCurrentUIState: React.Dispatch<React.SetStateAction<string>>,
    setImageRawData: React.Dispatch<React.SetStateAction<imageRawData[]>>
) => {
    console.log(`[ImageViewerPCF] Getting image data from bound field`);
    
    if (base64Stored && base64Stored.length > 0) {
        try {
            // Parse the JSON data directly
            const imgDataList = JSON.parse(base64Stored);
            setImageRawData(imgDataList);
            
            if (imgDataList.length === 0) {
                setCurrentUIState("dropImage");
            } else {
                setCurrentUIState("viewer");
            }
        } catch (error) {
            console.error(`[ImageViewerPCF] Error parsing JSON data: ${error}`);
            setCurrentUIState("dropImage");
            setImageRawData([]);
        }
    } else {
        console.log(`[ImageViewerPCF] No image data found in bound field`);
        setCurrentUIState("dropImage");
        setImageRawData([]);
    }
}


/**
 * Patch the record containing the file field with the file to push
 * @param webApiURL webApi URL of the record to update
 * @param imageRawData base64 array content of the file
 * @param setCurrentUIState for updating the UI state
 */

// export const patchFileContent = (
//     webApiURL: string,
//     imageRawData: imageRawData[],
//     setCurrentUIState: React.Dispatch<React.SetStateAction<string>>
// ) => {

//     console.log(`[ImageViewerPCF] Updating file data to CRM field`);

//     const req = new XMLHttpRequest()
//     req.open("PATCH", webApiURL)
//     req.setRequestHeader("Content-Type", "application/octet-stream")
//     req.setRequestHeader("Content-Range", "0-4095/8192")
//     req.setRequestHeader("Accept-Encoding", "gzip, deflate")
//     req.setRequestHeader("OData-MaxVersion", "4.0")
//     req.setRequestHeader("OData-Version", "4.0")
//     req.onreadystatechange = function () {
//         if (this.readyState === 4) {
//             req.onreadystatechange = null;
//             if (this.status === 200 || this.status === 204) {
//                 if (imageRawData.length == 0) {
//                     setCurrentUIState("dropImage")
//                 }
//                 else {
//                     setCurrentUIState("viewer")
//                 }
//             } else {
//                 const error = JSON.parse(this.response).error
//                 console.log(`[ImageViewerPCF] Error on patchFileContent : ${error.message}`)
//                 setCurrentUIState("viewer")
//             }
//         }
//     };

//     req.send(JSON.stringify(imageRawData));
// }

