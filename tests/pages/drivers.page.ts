import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * DriversPage: Drivers list and profile pages
 */

export class DriversPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // List Page Selectors
  get createDriverButton() {
    return 'button[data-testid="create-driver"]';
  }

  get driverSearchInput() {
    return 'input[data-testid="driver-search"]';
  }

  get driversTable() {
    return '[data-testid="drivers-table"]';
  }

  get driverRow() {
    return '[data-testid="driver-row"]';
  }

  // Profile Page Selectors
  get driverNameField() {
    return 'input[name="firstName"]';
  }

  get driverLastNameField() {
    return 'input[name="lastName"]';
  }

  get driverEmailField() {
    return 'input[name="email"]';
  }

  get driverPhoneField() {
    return 'input[name="phone"]';
  }

  get assignedTruckSelect() {
    return 'select[name="assignedTruckId"]';
  }

  get licenseNumberField() {
    return 'input[name="licenseNumber"]';
  }

  get licenseExpiryField() {
    return 'input[name="licenseExpiry"]';
  }

  get editProfileButton() {
    return 'button[data-testid="edit-driver"]';
  }

  get saveProfileButton() {
    return 'button[data-testid="save-driver"]';
  }

  get deleteDriverButton() {
    return 'button[data-testid="delete-driver"]';
  }

  get confirmDeleteButton() {
    return 'button[data-testid="confirm-delete"]';
  }

  get tripHistoryTab() {
    return 'button[data-testid="tab-trip-history"]';
  }

  get tripHistoryContent() {
    return '[data-testid="trip-history-content"]';
  }

  // Actions - List Page
  async navigate() {
    await this.goto('/drivers');
  }

  async expectDriversTableLoaded() {
    await this.expectVisible(this.driversTable);
    await this.waitForElement(this.driverRow, 5000);
  }

  async searchDriver(name: string) {
    await this.fillInput(this.driverSearchInput, name);
    await this.page.waitForTimeout(500); // Wait for debounce
    await this.page.waitForLoadState('networkidle');
  }

  async getDriverCount() {
    return this.page.locator(this.driverRow).count();
  }

  async clickCreateDriver() {
    await this.click(this.createDriverButton);
    await this.expectUrl(/\/drivers\/new/);
  }

  // Actions - Profile Page
  async navigateToDriverProfile(driverId: string) {
    await this.goto(`/drivers/${driverId}`);
  }

  async editDriver(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    assignedTruckId?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
  }) {
    await this.click(this.editProfileButton);

    if (data.firstName) {
      await this.fillInput(this.driverNameField, data.firstName);
    }
    if (data.lastName) {
      await this.fillInput(this.driverLastNameField, data.lastName);
    }
    if (data.email) {
      await this.fillInput(this.driverEmailField, data.email);
    }
    if (data.phone) {
      await this.fillInput(this.driverPhoneField, data.phone);
    }
    if (data.assignedTruckId) {
      await this.selectDropdown(this.assignedTruckSelect, data.assignedTruckId);
    }
    if (data.licenseNumber) {
      await this.fillInput(this.licenseNumberField, data.licenseNumber);
    }
    if (data.licenseExpiry) {
      await this.fillInput(this.licenseExpiryField, data.licenseExpiry);
    }

    await this.click(this.saveProfileButton);
    await this.page.waitForLoadState('networkidle');
  }

  async deleteDriver() {
    await this.click(this.deleteDriverButton);
    await this.click(this.confirmDeleteButton);
    await this.expectUrl('/drivers');
  }

  async viewTripHistory() {
    await this.click(this.tripHistoryTab);
    await this.expectVisible(this.tripHistoryContent);
    await this.page.waitForLoadState('networkidle');
  }
}
