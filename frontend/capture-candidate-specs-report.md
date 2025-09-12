# Candidate Spec Timing Capture
Generated: 2025-09-12T07:32:58.830Z
Loops per spec: 3
Current curated smoke total (last run): 21.05s

## vendor_product_upload.cy.js
Persona: vendor
Purpose: Upload flow, trust-critical
Runs (ms): 5385, 5376, 5630
Median: 5385 ms  |  Avg: 5464 ms
Share vs current smoke: 25.58%
Predicted share if added: 20.37% (new total ~ 26.43s)
Tag recommendations: @persona:vendor persona:vendor @trust

## vendor_forbidden_action.cy.js
Persona: vendor
Purpose: Role enforcement, edge-case
Runs (ms): 2885, 2855, 2816
Median: 2855 ms  |  Avg: 2852 ms
Share vs current smoke: 13.56%
Predicted share if added: 11.94% (new total ~ 23.90s)
Tag recommendations: @persona:vendor persona:vendor @trust @security

## customer_checkout.cy.js
Persona: customer
Purpose: Purchase flow, transactional
Runs (ms): 5703, 5776, 5650
Median: 5703 ms  |  Avg: 5710 ms
Share vs current smoke: 27.09%
Predicted share if added: 21.32% (new total ~ 26.75s)
Tag recommendations: @persona:customer persona:customer @checkout-flow

## customerFlow.cy.js
Persona: customer
Purpose: Lifecycle, multi-step
Runs (ms): 9556, 9562, 10151
Median: 9562 ms  |  Avg: 9756 ms
Share vs current smoke: 45.43%
Predicted share if added: 31.24% (new total ~ 30.61s)
Tag recommendations: @persona:customer persona:customer @journey

## auth_roles.cy.js
Persona: admin
Purpose: Permission matrix
Runs (ms): 19038, 16758, 16961
Median: 16961 ms  |  Avg: 17586 ms
Share vs current smoke: 80.58%
Predicted share if added: 44.62% (new total ~ 38.01s)
Tag recommendations: @persona:admin persona:admin @roles @security

## adminOrdersBulkDialogs.cy.js
Persona: admin
Purpose: Modal interactions
Runs (ms): 6723, 6353, 6302
Median: 6353 ms  |  Avg: 6459 ms
Share vs current smoke: 30.18%
Predicted share if added: 23.18% (new total ~ 27.40s)
Tag recommendations: @persona:admin persona:admin @ui
