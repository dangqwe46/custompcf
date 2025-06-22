export type imageViewerData = {
    name: string;
    original: string;
    thumbnail: string;
    originalHeight?: number;
}

export type imageRawData = {
    name: string;
    type: string;
    size: number;
    content: string;
    imageId?: string;
}