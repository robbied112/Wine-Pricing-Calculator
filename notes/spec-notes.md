Pricing Engine V2 – Spec
Global conventions

Inputs

Unless otherwise noted:

exCellarBottle – ex-cellar bottle price in source currency (EUR for Euro winery, USD for domestic).

casePack – bottles per case.

exchangeRate – FX, EUR → USD (for Euro winery models).

diFreightPerCase – direct-import freight per case, USD.

tariffPercent – tariff rate as percent of taxable base.

statesideLogisticsPerCase – domestic logistics per case, USD.

importerMarginPercent

distributorMarginPercent

retailerMarginPercent

Margin on selling price

All margins are margin on selling price, not markup.

For any step:

margin = percent / 100

sellingPrice = cost / (1 - margin)

If margin >= 1, we just fall back to sellingPrice = cost to avoid nonsense.

Common derived values

baseCaseSource = exCellarBottle * casePack

baseCaseUSD = baseCaseSource * exchangeRate (for Euro winery models)

wholesaleBottle = wholesaleCase / casePack

srpBottle = srpCase / casePack

1. DomesticWinery → Distributor

Used inputs

exCellarBottle

casePack

statesideLogisticsPerCase

distributorMarginPercent

retailerMarginPercent

Steps

baseCaseUSD = exCellarBottle * casePack

landedCase = baseCaseUSD + statesideLogisticsPerCase

Distributor selling price to retailer:

wholesaleCase = landedCase / (1 - distributorMarginPercent / 100)

wholesaleBottle = wholesaleCase / casePack

SRP:

srpCase = wholesaleCase / (1 - retailerMarginPercent / 100)
srpBottle = srpCase / casePack

Margins:

Distributor GP per case: distributorMarginPerCase = wholesaleCase - landedCase

Retailer GP per case: retailerMarginPerCase = srpCase - wholesaleCase

Winery revenue per case to recap:
wineryRevenuePerCase = baseCaseUSD (or landedCase if you want to treat logistics as pass-through, but right now we treat revenue as ex-cellar)

Example

Inputs:

ex-cellar bottle: 10.00 USD

case pack: 12

stateside logistics: 10

distributor margin: 25 %

retailer margin: 33 %

Calcs:

baseCaseUSD = 10 × 12 = 120.00

landedCase = 120 + 10 = 130.00

wholesaleCase = 130 / (1 - 0.25) = 130 / 0.75 = 173.33

wholesaleBottle = 173.33 / 12 ≈ 14.44

srpCase = 173.33 / (1 - 0.33) = 173.33 / 0.67 ≈ 258.70

srpBottle ≈ 21.56

distributorMarginPerCase = 173.33 - 130 = 43.33

retailerMarginPerCase = 258.70 - 173.33 ≈ 85.37

2. DomesticWinery → Retail (self-distribution)

Winery is both supplier and distributor, sells straight to accounts.

Used inputs

exCellarBottle

casePack

statesideLogisticsPerCase

retailerMarginPercent

Steps

baseCaseUSD = exCellarBottle * casePack

landedCase = baseCaseUSD + statesideLogisticsPerCase

Because there is no distributor step:

wholesaleCase = landedCase

wholesaleBottle = wholesaleCase / casePack

SRP:

srpCase = wholesaleCase / (1 - retailerMarginPercent / 100)
srpBottle = srpCase / casePack

Margins:

Retailer GP per case: retailerMarginPerCase = srpCase - wholesaleCase

Winery revenue per case: wineryRevenuePerCase = wholesaleCase

Example

Same numbers as above except no distributor:

ex-cellar: 10, casePack: 12, stateside: 10, retailer margin: 33%

Calcs:

baseCaseUSD = 120

landedCase = 130

wholesaleCase = 130

wholesaleBottle ≈ 10.83

srpCase = 130 / 0.67 ≈ 194.03

srpBottle ≈ 16.17

retailerMarginPerCase ≈ 64.03

wineryRevenuePerCase = 130

3. Euro Winery → Importer → Distributor (DI)

(model id: ImportedModelDI)

Inventory at Euro winery, importer sells DI containers directly to distributor.

Used inputs

exCellarBottle

casePack

exchangeRate

diFreightPerCase

tariffPercent

importerMarginPercent

distributorMarginPercent

retailerMarginPercent

Steps

Euro ex-cellar case in USD:

importerCostCaseUSD = exCellarBottle * casePack * exchangeRate

Importer selling price to distributor, margin on selling price:

importerMargin = importerMarginPercent / 100

importerFOBCaseUSD = importerCostCaseUSD / (1 - importerMargin)

Tariff base is importer FOB:

tariffCaseUSD = importerFOBCaseUSD * (tariffPercent / 100)

Distributor landed case for DI:

distributorLandedCaseUSD = importerFOBCaseUSD + tariffCaseUSD + diFreightPerCase

Distributor wholesale case:

distributorMargin = distributorMarginPercent / 100

wholesaleCase = distributorLandedCaseUSD / (1 - distributorMargin)

wholesaleBottle = wholesaleCase / casePack

SRP:

retailerMargin = retailerMarginPercent / 100

srpCase = wholesaleCase / (1 - retailerMargin)

srpBottle = srpCase / casePack

Recap margins:

Distributor GP per case:
distributorMarginPerCase = wholesaleCase - distributorLandedCaseUSD

Retailer GP per case:
retailerMarginPerCase = srpCase - wholesaleCase

Winery revenue per case (for supplier recap):
wineryRevenuePerCase = importerCostCaseUSD

Example

Inputs:

ex-cellar: 5.00 EUR

casePack: 12

FX: 1.16

DI freight: 13 USD

tariff: 15 %

importer margin: 30 %

distributor margin: 30 %

retailer margin: 33 %

Calcs:

importerCostCaseUSD = 5 × 12 × 1.16 = 69.60

importerFOBCaseUSD = 69.60 / 0.70 ≈ 99.43

tariffCaseUSD = 99.43 × 0.15 ≈ 14.91

distributorLandedCaseUSD = 99.43 + 14.91 + 13 ≈ 127.34

wholesaleCase = 127.34 / 0.70 ≈ 181.92

wholesaleBottle ≈ 15.16

srpCase = 181.92 / 0.67 ≈ 271.53

srpBottle ≈ 22.63

distributorMarginPerCase ≈ 54.58

retailerMarginPerCase ≈ 89.61

wineryRevenuePerCase = 69.60

If your UI currently shows lower SRP than this, it means somewhere you are still using markup instead of margin.

4. Euro Winery → Importer WH → Distributor (Stateside, SS)

(model id: ImportedModelSS)

Inventory sits in importer’s US warehouse. Distributor buys ex-WH, then adds stateside logistics.

Used inputs

exCellarBottle

casePack

exchangeRate

diFreightPerCase

tariffPercent

statesideLogisticsPerCase

importerMarginPercent

distributorMarginPercent

retailerMarginPercent

Steps

Winery ex-cellar case in USD:

baseCostCaseUSD = exCellarBottle * casePack * exchangeRate

Importer laid-in cost to US WH:

tariffOnBaseUSD = baseCostCaseUSD * (tariffPercent / 100)

importerLaidInCaseUSD = baseCostCaseUSD + diFreightPerCase + tariffOnBaseUSD

Importer FOB selling price from US WH:

importerMargin = importerMarginPercent / 100

importerFOBCaseUSD = importerLaidInCaseUSD / (1 - importerMargin)

Distributor landed case:

statesideCaseUSD = statesideLogisticsPerCase

distributorLandedCaseUSD = importerFOBCaseUSD + statesideCaseUSD

Distributor wholesale case:

distributorMargin = distributorMarginPercent / 100

wholesaleCase = distributorLandedCaseUSD / (1 - distributorMargin)

wholesaleBottle = wholesaleCase / casePack

SRP:

retailerMargin = retailerMarginPercent / 100

srpCase = wholesaleCase / (1 - retailerMargin)

srpBottle = srpCase / casePack

Recap:

distributorMarginPerCase = wholesaleCase - distributorLandedCaseUSD

retailerMarginPerCase = srpCase - wholesaleCase

wineryRevenuePerCase = importerFOBCaseUSD (what importer charges out of WH)

recapGrossProfitPerCase = distributorMarginPerCase

Example

Use same numbers plus stateside = 10:

baseCostCaseUSD = 69.60

tariffOnBaseUSD = 10.44

importerLaidInCaseUSD = 69.60 + 13 + 10.44 = 93.04

importerFOBCaseUSD = 93.04 / 0.70 ≈ 132.91

distributorLandedCaseUSD = 132.91 + 10 = 142.91

wholesaleCase = 142.91 / 0.70 ≈ 204.16

wholesaleBottle ≈ 17.01

srpCase = 204.16 / 0.67 ≈ 304.70

srpBottle ≈ 25.39

distributorMarginPerCase ≈ 61.25

retailerMarginPerCase ≈ 100.54

5. Euro Winery → Retailer direct, DI

(model id: Euro_DI_ToRetailer)

Retailer buys direct, pays all DI costs, no importer margin, no distributor.

Used inputs

exCellarBottle

casePack

exchangeRate

diFreightPerCase

tariffPercent

retailerMarginPercent (often 45–50% here, but taken from UI)

Steps

Ex-cellar case in USD:

baseCaseUSD = exCellarBottle * casePack * exchangeRate

Tariff base is that ex-cellar USD:

tariffUSD = baseCaseUSD * (tariffPercent / 100)

Retailer landed case:

landedCase = baseCaseUSD + diFreightPerCase + tariffUSD

Wholesale case and bottle (what retailer pays):

wholesaleCase = landedCase

wholesaleBottle = wholesaleCase / casePack

SRP:

retailerMargin = retailerMarginPercent / 100

srpCase = wholesaleCase / (1 - retailerMargin)

srpBottle = srpCase / casePack

Recap:

retailerMarginPerCase = srpCase - wholesaleCase

wineryRevenuePerCase = baseCaseUSD

Example

Inputs:

ex-cellar: 5 EUR

casePack: 12

FX: 1.16

DI freight: 13

tariff: 15%

retailer margin: 33% (UI default, even though 45–50% is more realistic)

Calcs:

baseCaseUSD = 5 × 12 × 1.16 = 69.60

tariffUSD = 69.60 × 0.15 = 10.44

landedCase = 69.60 + 13 + 10.44 = 93.04

wholesaleCase = 93.04

wholesaleBottle ≈ 7.75

srpCase = 93.04 / 0.67 ≈ 138.87

srpBottle ≈ 11.57

retailerMarginPerCase ≈ 45.83

wineryRevenuePerCase = 69.60