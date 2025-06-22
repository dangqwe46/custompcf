# AttachmentVideoControl for Dynamics 365

A PowerApps Component Framework (PCF) control for enhanced video attachment capabilities in Dynamics 365/Power Apps.

## Features

- **Video Upload & Playback**: Direct upload and inline playback of videos within forms
- **MP4 Format Support**: Handles MP4 video format
- **Mobile Optimization**: Fully functional on Dynamics 365 mobile app, including offline mode
- **Responsive Design**: Adapts to different form factor sizes and orientations
- **Debug Mode**: Built-in debugging tools to trace execution and troubleshoot issues
- **Modern UI**: Uses Microsoft's Fluent UI components with fallback support

## Project Structure

The project consists of two implementations:

1. **AttachmentVideoControl** - JavaScript/TypeScript implementation
   - Located in the root directory
   - Uses vanilla JS for DOM manipulation
   - Lightweight with minimal dependencies

2. **AttachmentVideoControlReact** - React implementation
   - Located in the `TESTREACT` directory
   - Uses React and Fluent UI for modern UI components
   - Resilient design with fallback components when Fluent UI is unavailable

## Setup Instructions

### Prerequisites

- Power Platform CLI
- Node.js 14+
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the project directory

For the vanilla implementation:
```bash
cd AttachmentVideoControl
npm install
npm run build
```

For the React implementation:
```bash
cd TESTREACT
npm install
npm run build
```

### Deployment

1. Build the solution:
```bash
npm run build
```

2. Create the solution file:
```bash
npm run solution
```

3. Import the generated solution file into your Dynamics 365 environment

## Configuration

The control accepts the following parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| debugMode | String | Set to "1" to enable debug information |
| maxSizeInMB | Number | Maximum file size in MB (default: 20) |
| entityType | String | Target entity logical name (optional - auto-detected) |

## Usage

### Basic Setup in Model-Driven App

1. Add a File field to your entity form
2. Configure the field to use the AttachmentVideoControl
3. Set any desired parameters
4. Save and publish

### Enabling Mobile Support

For mobile capabilities, ensure the control manifest includes the necessary features:

```xml
<feature-usage>
  <uses-feature name="WebAPI" required="true" />
  <uses-feature name="Utility" required="true" />
  <uses-feature name="Device.captureAudio" />
  <uses-feature name="Device.captureImage" />
  <uses-feature name="Device.captureVideo" />
  <uses-feature name="Device.pickFile" />
</feature-usage>
```

## UI Framework

### Fluent UI Integration

The React implementation uses Microsoft's Fluent UI components for a modern, consistent interface:

- Seamless integration with Microsoft 365 design language
- Responsive controls that adapt to different screen sizes
- Accessibility features built-in
- Fallback mechanism ensures the component works even when Fluent UI can't be loaded

For more details, see [FLUENT_UI_USAGE.md](./TESTREACT/FLUENT_UI_USAGE.md).

## Development

### Local Development

```bash
npm run start
```

This will start the local development server where you can test changes.

### Testing

```bash
npm run test
```

## Documentation

- For implementation guidance, see [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md)
- For troubleshooting, see [TROUBLESHOOTING_GUIDE.md](./docs/TROUBLESHOOTING_GUIDE.md)
- For mobile optimization details, see [MOBILE_OPTIMIZATION.md](./TESTREACT/MOBILE_OPTIMIZATION.md)
- For customization best practices, see [CUSTOMIZATION_BEST_PRACTICES.md](./docs/CUSTOMIZATION_BEST_PRACTICES.md)
- For debugging assistance, see [DEBUGGING.md](./docs/DEBUGGING.md)
- For Fluent UI usage, see [FLUENT_UI_USAGE.md](./TESTREACT/FLUENT_UI_USAGE.md)

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 