import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * AlertsPage: Fleet alerts management page
 * 
 * Features:
 * - List all active alerts with search/filter
 * - View alert details and history
 * - Resolve or dismiss alerts
 * - Multi-channel notifications status (FCM, SMS, Email)
 */

export class AlertsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get alertsTable() {
    return '[data-testid="alerts-table"]';
  }

  get alertRow() {
    return '[data-testid="alert-row"]';
  }

  get searchInput() {
    return 'input[data-testid="alert-search"]';
  }

  get severityFilter() {
    return 'select[data-testid="severity-filter"]';
  }

  get typeFilter() {
    return 'select[data-testid="type-filter"]';
  }

  get statusFilter() {
    return 'select[data-testid="status-filter"]';
  }

  get resolveAlertButton() {
    return 'button[data-testid="resolve-alert"]';
  }

  get dismissAlertButton() {
    return 'button[data-testid="dismiss-alert"]';
  }

  get confirmActionButton() {
    return 'button[data-testid="confirm-action"]';
  }

  get alertDetailPanel() {
    return '[data-testid="alert-detail"]';
  }

  get notificationStatusBadge() {
    return '[data-testid="notification-status"]';
  }

  // Actions
  async navigate() {
    await this.goto('/alerts');
  }

  async expectAlertsTableLoaded() {
    await this.expectVisible(this.alertsTable);
  }

  async searchAlert(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async filterBySeverity(severity: 'info' | 'warning' | 'critical') {
    await this.selectDropdown(this.severityFilter, severity);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByType(type: string) {
    await this.selectDropdown(this.typeFilter, type);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'active' | 'resolved' | 'dismissed') {
    await this.selectDropdown(this.statusFilter, status);
    await this.page.waitForLoadState('networkidle');
  }

  async getAlertCount() {
    return this.page.locator(this.alertRow).count();
  }

  async resolveAlert() {
    await this.click(this.resolveAlertButton);
    await this.click(this.confirmActionButton);
    await this.page.waitForLoadState('networkidle');
  }

  async dismissAlert() {
    await this.click(this.dismissAlertButton);
    await this.click(this.confirmActionButton);
    await this.page.waitForLoadState('networkidle');
  }

  async viewAlertDetail(alertIndex: number = 0) {
    const rows = this.page.locator(this.alertRow);
    await rows.nth(alertIndex).click();
    await this.expectVisible(this.alertDetailPanel);
  }

  async expectNotificationStatusVisible() {
    await this.expectVisible(this.notificationStatusBadge);
  }
}
