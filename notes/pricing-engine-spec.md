# Pricing Engine Design

## 1. Pricing Models

### Model A: Classic Import

**Flow:**
Winery → Importer → Distributor → Retail

**Steps:**
1. Ex-cellar EUR
2. FX conversion + buffer
3. Tariff
4. DI freight
5. Importer landed cost
6. Importer margin → Distributor FOB
7. Stateside logistics
8. Distributor margin → Wholesale
9. Retailer margin → SRP

### Model B: Euro to Distributor (Ex-Cellar Europe)

**Flow:**
Winery → Distributor (Distributor acts as importer)

**Steps:**
1. Ex-cellar EUR
2. FX conversion
3. Tariff
4. DI freight
5. Distributor landed cost
6. Distributor margin → Wholesale
7. Retailer margin → SRP

### Model C: Euro to Distributor (US Warehouse)

**Flow:**
Winery ships to US, inventory already landed before distributor purchase

**Steps:**
1. Ex-cellar EUR
2. FX conversion
3. Tariff
4. DI freight
5. Landed inventory cost (LIC)
6. Winery margin → Stateside FOB
7. Domestic logistics
8. Distributor margin → Wholesale
9. Retailer margin → SRP

### Model D1: Domestic Winery → Distributor

**Flow:**
Classic domestic 3-tier

**Steps:**
1. Ex-cellar bottle
2. Case cost
3. Domestic freight
4. Distributor landed cost
5. Distributor margin → Wholesale
6. Retailer margin → SRP

### Model D2: Domestic Winery → Retail

**Flow:**
Direct-to-trade / self-distribution

**Steps:**
1. Ex-cellar bottle
2. Case cost
3. Domestic freight
4. Retail landed cost
5. Retail margin → SRP

## 2. Decision Enums

- **BusinessType:** EuropeanWinery, DomesticWinery, Importer, Distributor
- **InventoryLocation:** Europe, USWarehouse, USWinery
- **SellTo:** Importer, Distributor, Retailer, DirectToTrade
- **RecapActor:** Supplier, Importer, Distributor
- **PricingModel:** ClassicImport, EuroToDistributor_ExCellar, EuroToDistributor_USWarehouse, DomesticWineryToDistributor, DomesticWineryToRetail

## 3. WizardState Shape

Document all fields needed:

- **businessType**
- **inventoryLocation**
- **sellTo**
- **recapActor**
- **currency**
- **exchangeRate & buffer**
- **exCellarBottle, bottleCost, casePack**
- **tariffPercent**
- **diFreightPerCase**
- **statesideLogisticsPerCase**
- **supplierMargin, distributorMargin, retailerMargin**

## 4. PricingOutput

Document all returned fields:

- **FOBs**
- **Landed costs**
- **Wholesale (case/bottle)**
- **SRP (case/bottle)**
- **Margins per case based on recapActor**