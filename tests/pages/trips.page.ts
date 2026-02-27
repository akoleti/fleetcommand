import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * TripsPage: Trips management page
 */

export class TripsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get createTripButton() {
    return 'button[data-testid="create-trip"]';
  }

  get tripsTable() {
    return '[data-testid="trips-table"]';
  }

  get tripRow() {
    return '[data-testid="trip-row"]';
  }

  get tripSearchInput() {
    return 'input[data-testid="trip-search"]';
  }

  get statusFilterSelect() {
    return 'select[data-testid="status-filter"]';
  }

  // Form Selectors
  get truckSelect() {
    return 'select[name="truckId"]';
  }

  get pickupLocationInput() {
    return 'input[name="pickupLocation"]';
  }

  get dropoffLocationInput() {
    return 'input[name="dropoffLocation"]';
  }

  get plannedStartInput() {
    return 'input[name="plannedStart"]';
  }

  get plannedEndInput() {
    return 'input[name="plannedEnd"]';
  }

  get saveTripButton() {
    return 'button[data-testid="save-trip"]';
  }

  get editTripButton() {
    return 'button[data-testid="edit-trip"]';
  }

  get completeTripButton() {
    return 'button[data-testid="complete-trip"]';
  }

  get cancelTripButton() {
    return 'button[data-testid="cancel-trip"]';
  }

  get confirmActionButton() {
    return 'button[data-testid="confirm-action"]';
  }

  // Actions
  async navigate() {
    await this.goto('/trips');
  }

  async expectTripsTableLoaded() {
    await this.expectVisible(this.tripsTable);
    await this.waitForElement(this.tripRow, 5000);
  }

  async getTripCount() {
    return this.page.locator(this.tripRow).count();
  }

  async createTrip(data: {
    truckId: string;
    pickupLocation: string;
    dropoffLocation: string;
    plannedStart: string;
    plannedEnd: string;
  }) {
    await this.click(this.createTripButton);
    
    await this.selectDropdown(this.truckSelect, data.truckId);
    await this.fillInput(this.pickupLocationInput, data.pickupLocation);
    await this.fillInput(this.dropoffLocationInput, data.dropoffLocation);
    await this.fillInput(this.plannedStartInput, data.plannedStart);
    await this.fillInput(this.plannedEndInput, data.plannedEnd);
    
    await this.click(this.saveTripButton);
    await this.page.waitForLoadState('networkidle');
  }

  async searchTrip(query: string) {
    await this.fillInput(this.tripSearchInput, query);
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'scheduled' | 'active' | 'completed' | 'cancelled') {
    await this.selectDropdown(this.statusFilterSelect, status);
    await this.page.waitForLoadState('networkidle');
  }

  async completeTrip() {
    await this.click(this.completeTripButton);
    await this.click(this.confirmActionButton);
    await this.page.waitForLoadState('networkidle');
  }

  async cancelTrip() {
    await this.click(this.cancelTripButton);
    await this.click(this.confirmActionButton);
    await this.page.waitForLoadState('networkidle');
  }
}
