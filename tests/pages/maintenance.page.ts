import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * MaintenancePage: Maintenance logs, insurance policies, and claims management
 * 
 * Features:
 * - Maintenance logs (CRUD, service history)
 * - Insurance policies (per-truck tracking, multiple policies)
 * - Claims workflow (open → pending → settled)
 * - Expiry alerts (30/7-day warnings)
 */

export class MaintenancePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Maintenance Logs Selectors
  get maintenanceTab() {
    return 'button[data-testid="tab-maintenance"]';
  }

  get maintenanceTable() {
    return '[data-testid="maintenance-table"]';
  }

  get createLogButton() {
    return 'button[data-testid="create-maintenance-log"]';
  }

  get logTypeSelect() {
    return 'select[name="type"]';
  }

  get logCostInput() {
    return 'input[name="cost"]';
  }

  get logDescriptionInput() {
    return 'textarea[name="description"]';
  }

  get logDateInput() {
    return 'input[name="serviceDate"]';
  }

  get nextServiceInput() {
    return 'input[name="nextServiceDate"]';
  }

  get saveLogButton() {
    return 'button[data-testid="save-log"]';
  }

  // Insurance Selectors
  get insuranceTab() {
    return 'button[data-testid="tab-insurance"]';
  }

  get insuranceTable() {
    return '[data-testid="insurance-table"]';
  }

  get createPolicyButton() {
    return 'button[data-testid="create-policy"]';
  }

  get policyProviderInput() {
    return 'input[name="provider"]';
  }

  get policyNumberInput() {
    return 'input[name="policyNumber"]';
  }

  get policyStartInput() {
    return 'input[name="startDate"]';
  }

  get policyEndInput() {
    return 'input[name="endDate"]';
  }

  get policyCoverageSelect() {
    return 'select[name="coverage"]';
  }

  get savePolicyButton() {
    return 'button[data-testid="save-policy"]';
  }

  get activatePolicyButton() {
    return 'button[data-testid="activate-policy"]';
  }

  // Claims Selectors
  get claimsTab() {
    return 'button[data-testid="tab-claims"]';
  }

  get claimsTable() {
    return '[data-testid="claims-table"]';
  }

  get createClaimButton() {
    return 'button[data-testid="create-claim"]';
  }

  get claimTypeSelect() {
    return 'select[name="type"]';
  }

  get claimDescriptionInput() {
    return 'textarea[name="description"]';
  }

  get claimAmountInput() {
    return 'input[name="amount"]';
  }

  get claimDateInput() {
    return 'input[name="incidentDate"]';
  }

  get saveClaimButton() {
    return 'button[data-testid="save-claim"]';
  }

  get updateClaimStatusSelect() {
    return 'select[name="status"]';
  }

  get updateClaimButton() {
    return 'button[data-testid="update-claim"]';
  }

  // Actions
  async navigate() {
    await this.goto('/maintenance');
  }

  async navigateToMaintenanceLogs() {
    await this.click(this.maintenanceTab);
    await this.expectVisible(this.maintenanceTable);
  }

  async createMaintenanceLog(data: {
    type: string;
    serviceDate: string;
    description: string;
    cost: string;
    nextServiceDate: string;
  }) {
    await this.click(this.createLogButton);
    
    await this.selectDropdown(this.logTypeSelect, data.type);
    await this.fillInput(this.logDateInput, data.serviceDate);
    await this.fillInput(this.logDescriptionInput, data.description);
    await this.fillInput(this.logCostInput, data.cost);
    await this.fillInput(this.nextServiceInput, data.nextServiceDate);
    
    await this.click(this.saveLogButton);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToInsurance() {
    await this.click(this.insuranceTab);
    await this.expectVisible(this.insuranceTable);
  }

  async createInsurancePolicy(data: {
    provider: string;
    policyNumber: string;
    coverage: string;
    startDate: string;
    endDate: string;
  }) {
    await this.click(this.createPolicyButton);
    
    await this.fillInput(this.policyProviderInput, data.provider);
    await this.fillInput(this.policyNumberInput, data.policyNumber);
    await this.selectDropdown(this.policyCoverageSelect, data.coverage);
    await this.fillInput(this.policyStartInput, data.startDate);
    await this.fillInput(this.policyEndInput, data.endDate);
    
    await this.click(this.savePolicyButton);
    await this.page.waitForLoadState('networkidle');
  }

  async activatePolicy() {
    await this.click(this.activatePolicyButton);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToClaims() {
    await this.click(this.claimsTab);
    await this.expectVisible(this.claimsTable);
  }

  async createClaim(data: {
    type: string;
    incidentDate: string;
    description: string;
    amount: string;
  }) {
    await this.click(this.createClaimButton);
    
    await this.selectDropdown(this.claimTypeSelect, data.type);
    await this.fillInput(this.claimDateInput, data.incidentDate);
    await this.fillInput(this.claimDescriptionInput, data.description);
    await this.fillInput(this.claimAmountInput, data.amount);
    
    await this.click(this.saveClaimButton);
    await this.page.waitForLoadState('networkidle');
  }

  async updateClaimStatus(newStatus: 'open' | 'pending' | 'settled') {
    await this.selectDropdown(this.updateClaimStatusSelect, newStatus);
    await this.click(this.updateClaimButton);
    await this.page.waitForLoadState('networkidle');
  }

  async expectExpiryWarning(daysUntilExpiry: number) {
    if (daysUntilExpiry <= 7) {
      await this.expectVisible('[data-testid="critical-expiry-warning"]');
    } else if (daysUntilExpiry <= 30) {
      await this.expectVisible('[data-testid="expiry-warning"]');
    }
  }
}
