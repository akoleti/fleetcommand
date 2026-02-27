import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * FuelPage: Fuel logs and cost analysis
 * 
 * Features:
 * - Fuel logs (per-truck, per-trip)
 * - Cost tracking and analysis
 * - PDF reports generation
 * - Fuel efficiency metrics
 */

export class FuelPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get fuelLogsTable() {
    return '[data-testid="fuel-logs-table"]';
  }

  get fuelLogRow() {
    return '[data-testid="fuel-log-row"]';
  }

  get createFuelLogButton() {
    return 'button[data-testid="create-fuel-log"]';
  }

  get truckSelect() {
    return 'select[name="truckId"]';
  }

  get quantityInput() {
    return 'input[name="quantity"]';
  }

  get costInput() {
    return 'input[name="cost"]';
  }

  get dateInput() {
    return 'input[name="refuelDate"]';
  }

  get locationInput() {
    return 'input[name="location"]';
  }

  get saveFuelLogButton() {
    return 'button[data-testid="save-fuel-log"]';
  }

  get generateReportButton() {
    return 'button[data-testid="generate-report"]';
  }

  get reportFormatSelect() {
    return 'select[name="format"]';
  }

  get dateRangeStartInput() {
    return 'input[name="startDate"]';
  }

  get dateRangeEndInput() {
    return 'input[name="endDate"]';
  }

  get fuelCostChart() {
    return '[data-testid="fuel-cost-chart"]';
  }

  get fuelEfficiencyChart() {
    return '[data-testid="fuel-efficiency-chart"]';
  }

  get totalCostMetric() {
    return '[data-testid="total-cost"]';
  }

  get averageEfficiencyMetric() {
    return '[data-testid="avg-efficiency"]';
  }

  // Actions
  async navigate() {
    await this.goto('/fuel');
  }

  async expectFuelLogsTableLoaded() {
    await this.expectVisible(this.fuelLogsTable);
    await this.waitForElement(this.fuelLogRow, 5000);
  }

  async getFuelLogCount() {
    return this.page.locator(this.fuelLogRow).count();
  }

  async createFuelLog(data: {
    truckId: string;
    quantity: string;
    cost: string;
    refuelDate: string;
    location: string;
  }) {
    await this.click(this.createFuelLogButton);
    
    await this.selectDropdown(this.truckSelect, data.truckId);
    await this.fillInput(this.quantityInput, data.quantity);
    await this.fillInput(this.costInput, data.cost);
    await this.fillInput(this.dateInput, data.refuelDate);
    await this.fillInput(this.locationInput, data.location);
    
    await this.click(this.saveFuelLogButton);
    await this.page.waitForLoadState('networkidle');
  }

  async generatePDFReport(data: {
    startDate: string;
    endDate: string;
  }) {
    await this.click(this.generateReportButton);
    await this.selectDropdown(this.reportFormatSelect, 'pdf');
    await this.fillInput(this.dateRangeStartInput, data.startDate);
    await this.fillInput(this.dateRangeEndInput, data.endDate);
    
    // Wait for PDF download
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("Download")');
    const download = await downloadPromise;
    
    return download;
  }

  async expectChartsLoaded() {
    await this.expectVisible(this.fuelCostChart);
    await this.expectVisible(this.fuelEfficiencyChart);
  }

  async expectMetricsDisplayed() {
    await this.expectVisible(this.totalCostMetric);
    await this.expectVisible(this.averageEfficiencyMetric);
  }

  async getTotalCost() {
    const text = await this.page.locator(this.totalCostMetric).textContent();
    const match = text?.match(/\$([0-9,]+\.?\d*)/);
    return parseFloat(match?.[1]?.replace(/,/g, '') || '0');
  }

  async getAverageEfficiency() {
    const text = await this.page.locator(this.averageEfficiencyMetric).textContent();
    const match = text?.match(/(\d+\.?\d*)\s*mph?/i);
    return parseFloat(match?.[1] || '0');
  }
}
