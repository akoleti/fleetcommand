import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * DashboardPage: Main dashboard landing page with fleet overview
 */

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get fleetStatusCard() {
    return '[data-testid="fleet-status-card"]';
  }

  get activeVehiclesCounter() {
    return '[data-testid="active-vehicles"]';
  }

  get idleVehiclesCounter() {
    return '[data-testid="idle-vehicles"]';
  }

  get onTripCounter() {
    return '[data-testid="on-trip"]';
  }

  get recentAlertsSection() {
    return '[data-testid="recent-alerts"]';
  }

  get liveMapContainer() {
    return '[data-testid="live-map"]';
  }

  get trucksLink() {
    return 'a[href="/trucks"]';
  }

  get driversLink() {
    return 'a[href="/drivers"]';
  }

  get alertsLink() {
    return 'a[href="/alerts"]';
  }

  get maintenanceLink() {
    return 'a[href="/maintenance"]';
  }

  // Actions
  async navigate() {
    await this.goto('/dashboard');
  }

  async expectFleetStatsLoaded() {
    await this.expectVisible(this.fleetStatusCard);
    await this.expectVisible(this.activeVehiclesCounter);
  }

  async expectLiveMapLoaded() {
    await this.expectVisible(this.liveMapContainer);
  }

  async expectRecentAlertsVisible() {
    await this.expectVisible(this.recentAlertsSection);
  }

  async getActiveVehicleCount() {
    const text = await this.page.locator(this.activeVehiclesCounter).textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0');
  }

  async navigateToTrucks() {
    await this.click(this.trucksLink);
    await this.expectUrl('/trucks');
  }

  async navigateToDrivers() {
    await this.click(this.driversLink);
    await this.expectUrl('/drivers');
  }

  async navigateToAlerts() {
    await this.click(this.alertsLink);
    await this.expectUrl('/alerts');
  }

  async navigateToMaintenance() {
    await this.click(this.maintenanceLink);
    await this.expectUrl('/maintenance');
  }
}
