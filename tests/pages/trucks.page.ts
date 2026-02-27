import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * TrucksPage: Trucks list and detail pages
 */

export class TrucksPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // List Page Selectors
  get createTruckButton() {
    return 'button[data-testid="create-truck"]';
  }

  get searchInput() {
    return 'input[data-testid="truck-search"]';
  }

  get filterButton() {
    return 'button[data-testid="truck-filter"]';
  }

  get trucksTable() {
    return '[data-testid="trucks-table"]';
  }

  get truckRow() {
    return '[data-testid="truck-row"]';
  }

  // Detail Page Selectors
  get truckNameField() {
    return 'input[name="licenseNumber"]';
  }

  get truckVINField() {
    return 'input[name="vin"]';
  }

  get truckStatusSelect() {
    return 'select[name="status"]';
  }

  get editButton() {
    return 'button[data-testid="edit-truck"]';
  }

  get saveButton() {
    return 'button[data-testid="save-truck"]';
  }

  get deleteButton() {
    return 'button[data-testid="delete-truck"]';
  }

  get confirmDeleteButton() {
    return 'button[data-testid="confirm-delete"]';
  }

  // Tab Selectors (detail page)
  get locationTab() {
    return 'button[data-testid="tab-location"]';
  }

  get tripsTab() {
    return 'button[data-testid="tab-trips"]';
  }

  get maintenanceTab() {
    return 'button[data-testid="tab-maintenance"]';
  }

  get fuelTab() {
    return 'button[data-testid="tab-fuel"]';
  }

  get insuranceTab() {
    return 'button[data-testid="tab-insurance"]';
  }

  get alertsTab() {
    return 'button[data-testid="tab-alerts"]';
  }

  // Actions - List Page
  async navigate() {
    await this.goto('/trucks');
  }

  async expectTrucksTableLoaded() {
    await this.expectVisible(this.trucksTable);
    await this.waitForElement(this.truckRow, 5000);
  }

  async searchTruck(licenseNumber: string) {
    await this.fillInput(this.searchInput, licenseNumber);
    await this.page.waitForTimeout(500); // Wait for debounce
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateTruck() {
    await this.click(this.createTruckButton);
    await this.expectUrl(/\/trucks\/new/);
  }

  async getTruckCountFromList() {
    const rows = await this.page.locator(this.truckRow).count();
    return rows;
  }

  // Actions - Detail Page
  async navigateToTruckDetail(truckId: string) {
    await this.goto(`/trucks/${truckId}`);
  }

  async editTruck(data: { licenseNumber?: string; vin?: string; status?: string }) {
    await this.click(this.editButton);
    
    if (data.licenseNumber) {
      await this.fillInput(this.truckNameField, data.licenseNumber);
    }
    if (data.vin) {
      await this.fillInput(this.truckVINField, data.vin);
    }
    if (data.status) {
      await this.selectDropdown(this.truckStatusSelect, data.status);
    }
    
    await this.click(this.saveButton);
    await this.page.waitForLoadState('networkidle');
  }

  async deleteTruck() {
    await this.click(this.deleteButton);
    await this.click(this.confirmDeleteButton);
    await this.expectUrl('/trucks');
  }

  async clickTab(tabName: 'location' | 'trips' | 'maintenance' | 'fuel' | 'insurance' | 'alerts') {
    const tabSelector = {
      location: this.locationTab,
      trips: this.tripsTab,
      maintenance: this.maintenanceTab,
      fuel: this.fuelTab,
      insurance: this.insuranceTab,
      alerts: this.alertsTab,
    }[tabName];

    await this.click(tabSelector);
    await this.page.waitForLoadState('networkidle');
  }

  async expectTabContentLoaded(tabName: string) {
    await this.expectVisible(`[data-testid="tab-content-${tabName}"]`);
  }
}
