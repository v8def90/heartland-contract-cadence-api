/**
 * Create test images for integration tests
 *
 * This script creates various test images using Canvas API
 * to simulate real image upload scenarios.
 */

const fs = require('fs');
const path = require('path');

// Simple SVG generator for test images
function createTestSVG(width, height, color, text) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="24">
    ${text}
  </text>
</svg>`;
}

// Create test images directory
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Create test images
const testImages = [
  {
    name: 'test-avatar.png',
    content: createTestSVG(256, 256, '#4A90E2', 'Avatar'),
    description: 'Test avatar image (256x256)',
  },
  {
    name: 'test-background.jpg',
    content: createTestSVG(1920, 1080, '#7ED321', 'Background'),
    description: 'Test background image (1920x1080)',
  },
  {
    name: 'test-image.webp',
    content: createTestSVG(512, 512, '#F5A623', 'WebP'),
    description: 'Test WebP image (512x512)',
  },
  {
    name: 'test-large.png',
    content: createTestSVG(4000, 3000, '#D0021B', 'Large'),
    description: 'Test large image (4000x3000) - exceeds size limit',
  },
  {
    name: 'test-small.png',
    content: createTestSVG(64, 64, '#9013FE', 'Small'),
    description: 'Test small image (64x64)',
  },
];

console.log('Creating test images...');

testImages.forEach(image => {
  const filePath = path.join(imagesDir, image.name);
  fs.writeFileSync(filePath, image.content);
  console.log(`✓ Created ${image.name} - ${image.description}`);
});

console.log('\nTest images created successfully!');
console.log(
  'Note: These are SVG files with .png/.jpg/.webp extensions for testing purposes.'
);
console.log('In real tests, you would use actual image files.');
