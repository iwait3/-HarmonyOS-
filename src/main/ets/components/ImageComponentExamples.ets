import { image } from '@kit.ImageKit';
import { BusinessError } from '@kit.BasicServicesKit';

@Entry
@Component
struct ImageComponentExamples {
  // Approach 1: String URL (Network Image)
  @State networkImageUrl: string = 'https://example.com/image.jpg';
  
  // Approach 2: Resource reference (Local Image)
  @State localImageResource: Resource = $r('app.media.my_image');
  
  // Approach 3: PixelMap (Dynamic/Dynamic Image)
  @State pixelMapImage: image.PixelMap | null = null;
  
  // Approach 4: Conditional rendering with proper typing
  @State showNetworkImage: boolean = true;
  @State showLocalImage: boolean = true;
  @State showPixelMapImage: boolean = false;
  
  aboutToAppear(): void {
    // Initialize PixelMap when component appears
    this.createPixelMapFromResource();
  }
  
  build() {
    Column({ space: 20 }) {
      Text('Image Component - Correct src Property Usage')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 20 })
      
      // Section 1: Network Images (String URL)
      Text('1. Network Images (String URL)')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .align(Alignment.Start)
        .width('100%')
      
      if (this.showNetworkImage) {
        Column() {
          // Correct: Direct string URL
          Image(this.networkImageUrl)
            .width(200)
            .height(150)
            .objectFit(ImageFit.Cover)
            .borderRadius(10)
            .onError(() => {
              console.error('Network image failed to load');
              this.showNetworkImage = false;
            })
            .onComplete(() => {
              console.info('Network image loaded successfully');
            })
          
          Text('Network Image with Error Handling')
            .fontSize(12)
            .fontColor(Color.Gray)
        }
        .padding(10)
        .border({ width: 1, color: Color.Gray })
        .borderRadius(8)
      }
      
      // Section 2: Local Images (Resource)
      Text('2. Local Images (Resource)')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .align(Alignment.Start)
        .width('100%')
      
      if (this.showLocalImage) {
        Column() {
          // Correct: Resource reference using $r()
          Image(this.localImageResource)
            .width(200)
            .height(150)
            .objectFit(ImageFit.Contain)
            .borderRadius(10)
            .alt($r('app.media.placeholder')) // Fallback image
          
          Text('Local Resource Image with Alt')
            .fontSize(12)
            .fontColor(Color.Gray)
        }
        .padding(10)
        .border({ width: 1, color: Color.Gray })
        .borderRadius(8)
      }
      
      // Section 3: PixelMap Images
      Text('3. PixelMap Images (Dynamic)')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .align(Alignment.Start)
        .width('100%')
      
      if (this.showPixelMapImage && this.pixelMapImage !== null) {
        Column() {
          // Correct: PixelMap instance
          Image(this.pixelMapImage)
            .width(200)
            .height(150)
            .objectFit(ImageFit.Fill)
            .borderRadius(10)
          
          Text('Dynamic PixelMap Image')
            .fontSize(12)
            .fontColor(Color.Gray)
        }
        .padding(10)
        .border({ width: 1, color: Color.Gray })
        .borderRadius(8)
      } else {
        Text('PixelMap not available or loading...')
          .fontSize(14)
          .fontColor(Color.Gray)
          .padding(20)
      }
      
      // Section 4: Control Buttons
      Row({ space: 10 }) {
        Button('Toggle Network')
          .onClick(() => {
            this.showNetworkImage = !this.showNetworkImage;
          })
        
        Button('Toggle Local')
          .onClick(() => {
            this.showLocalImage = !this.showLocalImage;
          })
        
        Button('Toggle PixelMap')
          .onClick(() => {
            this.showPixelMapImage = !this.showPixelMapImage;
          })
      }
      .margin({ top: 20 })
      
      // Section 5: Type Safety Best Practices
      Text('4. Type Safety Best Practices')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .align(Alignment.Start)
        .width('100%')
        .margin({ top: 20 })
      
      this.TypeSafeImageExamples()
      
    }
    .padding(20)
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
  }
  
  @Builder
  TypeSafeImageExamples() {
    Column({ space: 15 }) {
      // Example 1: Type-safe conditional rendering
      Text('Type-safe Conditional Rendering:')
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
      
      if (this.isValidImageUrl(this.networkImageUrl)) {
        Image(this.networkImageUrl)
          .width(100)
          .height(80)
          .objectFit(ImageFit.Cover)
      } else {
        Text('Invalid URL')
          .fontSize(12)
          .fontColor(Color.Red)
          .width(100)
          .height(80)
          .backgroundColor('#F0F0F0')
          .textAlign(TextAlign.Center)
      }
      
      // Example 2: Safe PixelMap usage
      Text('Safe PixelMap Usage:')
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 10 })
      
      if (this.pixelMapImage !== null) {
        Image(this.pixelMapImage)
          .width(100)
          .height(80)
          .objectFit(ImageFit.Cover)
      } else {
        this.PlaceholderImage()
      }
      
    }
    .padding(15)
    .border({ width: 1, color: '#E0E0E0' })
    .borderRadius(8)
    .backgroundColor('#F8F9FA')
  }
  
  @Builder
  PlaceholderImage() {
    Column() {
      Text('Loading...')
        .fontSize(10)
        .fontColor(Color.Gray)
    }
    .width(100)
    .height(80)
    .backgroundColor('#F0F0F0')
    .justifyContent(FlexAlign.Center)
  }
  
  // Helper method to validate image URLs
  private isValidImageUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http') || url.startsWith('https');
    } catch {
      return false;
    }
  }
  
  // Create PixelMap from resource (simulated)
  private async createPixelMapFromResource(): Promise<void> {
    try {
      // Simulate creating a PixelMap (in real scenario, you'd load from file)
      const colorBuffer = new ArrayBuffer(96); // 4x6 pixels * 4 bytes per pixel
      const options: image.InitializationOptions = {
        editable: true,
        pixelFormat: image.PixelMapFormat.RGBA_8888,
        size: { height: 4, width: 6 }
      };
      
      image.createPixelMap(colorBuffer, options)
        .then((pixelMap: image.PixelMap) => {
          this.pixelMapImage = pixelMap;
          console.info('PixelMap created successfully');
        })
        .catch((error: BusinessError) => {
          console.error(`Failed to create PixelMap: ${error.message}`);
        });
        
    } catch (error) {
      console.error('Error creating PixelMap:', error);
    }
  }
}