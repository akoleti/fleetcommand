import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * DeliveryPage: Delivery proof with signatures, photos, and GPS embedding
 * 
 * Features:
 * - Delivery proof CRUD
 * - Signature canvas capture
 * - Photo capture with GPS embedding
 * - Offline queue sync
 * - View delivery media via S3 presigned URLs
 */

export class DeliveryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get deliveryProofsTable() {
    return '[data-testid="delivery-proofs-table"]';
  }

  get deliveryProofRow() {
    return '[data-testid="delivery-proof-row"]';
  }

  get createDeliveryButton() {
    return 'button[data-testid="create-delivery"]';
  }

  get tripSelect() {
    return 'select[name="tripId"]';
  }

  get recipientNameInput() {
    return 'input[name="recipientName"]';
  }

  get recipientEmailInput() {
    return 'input[name="recipientEmail"]';
  }

  get deliveryNoteInput() {
    return 'textarea[name="notes"]';
  }

  // Signature Canvas
  get signatureCanvas() {
    return '[data-testid="signature-canvas"]';
  }

  get signaturePad() {
    return 'canvas[data-testid="signature-pad"]';
  }

  get clearSignatureButton() {
    return 'button[data-testid="clear-signature"]';
  }

  get confirmSignatureButton() {
    return 'button[data-testid="confirm-signature"]';
  }

  // Photo Capture
  get photoInput() {
    return 'input[type="file"][data-testid="photo-upload"]';
  }

  get capturePhotoButton() {
    return 'button[data-testid="capture-photo"]';
  }

  get photosSection() {
    return '[data-testid="photos-section"]';
  }

  get photoPreview() {
    return '[data-testid="photo-preview"]';
  }

  get gpsEmbeddedBadge() {
    return '[data-testid="gps-embedded"]';
  }

  // Submit & Actions
  get saveDeliveryButton() {
    return 'button[data-testid="save-delivery"]';
  }

  get submitDeliveryButton() {
    return 'button[data-testid="submit-delivery"]';
  }

  get editDeliveryButton() {
    return 'button[data-testid="edit-delivery"]';
  }

  get viewProofButton() {
    return 'button[data-testid="view-proof"]';
  }

  // Detail View
  get deliveryDetailPanel() {
    return '[data-testid="delivery-detail"]';
  }

  get signatureImage() {
    return '[data-testid="signature-image"]';
  }

  get deliveryPhotosGallery() {
    return '[data-testid="delivery-photos-gallery"]';
  }

  // Offline & Sync
  get offlineQueueIndicator() {
    return '[data-testid="offline-queue"]';
  }

  get syncButton() {
    return 'button[data-testid="sync-queue"]';
  }

  // Actions
  async navigate() {
    await this.goto('/delivery');
  }

  async expectDeliveryTableLoaded() {
    await this.expectVisible(this.deliveryProofsTable);
  }

  async startDeliveryCapture(tripId: string) {
    await this.click(this.createDeliveryButton);
    await this.selectDropdown(this.tripSelect, tripId);
  }

  async fillRecipientInfo(data: {
    recipientName: string;
    recipientEmail: string;
    notes?: string;
  }) {
    await this.fillInput(this.recipientNameInput, data.recipientName);
    await this.fillInput(this.recipientEmailInput, data.recipientEmail);
    
    if (data.notes) {
      await this.fillInput(this.deliveryNoteInput, data.notes);
    }
  }

  async captureSignature() {
    await this.expectVisible(this.signaturePad);
    
    // Simulate signature drawing on canvas
    const canvas = await this.page.locator(this.signaturePad);
    const box = await canvas.boundingBox();
    
    if (box) {
      // Draw a simple line signature
      await this.page.mouse.move(box.x + 10, box.y + 10);
      await this.page.mouse.down();
      await this.page.mouse.move(box.x + 100, box.y + 50);
      await this.page.mouse.up();
    }

    await this.click(this.confirmSignatureButton);
  }

  async uploadPhoto(filePath: string) {
    await this.page.locator(this.photoInput).setInputFiles(filePath);
    await this.expectVisible(this.photoPreview);
    await this.page.waitForLoadState('networkidle');
  }

  async expectGPSEmbedded() {
    await this.expectVisible(this.gpsEmbeddedBadge);
  }

  async submitDeliveryProof() {
    await this.click(this.submitDeliveryButton);
    await this.page.waitForLoadState('networkidle');
    await this.expectUrl('/delivery');
  }

  async viewDeliveryProof(proofIndex: number = 0) {
    const rows = this.page.locator(this.deliveryProofRow);
    await rows.nth(proofIndex).click();
    
    await this.expectVisible(this.deliveryDetailPanel);
    await this.expectVisible(this.signatureImage);
    await this.expectVisible(this.deliveryPhotosGallery);
  }

  async expectOfflineQueueIndicator() {
    await this.expectVisible(this.offlineQueueIndicator);
  }

  async syncOfflineQueue() {
    await this.click(this.syncButton);
    await this.page.waitForLoadState('networkidle');
  }

  async getDeliveryProofCount() {
    return this.page.locator(this.deliveryProofRow).count();
  }
}
