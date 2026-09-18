using supply from '../db/schema';

service SupplyService @(path: '/supply') {

  // lastItemNo is technical state (plan D-4): persisted, never exposed, so that
  // RF-2 holds for everything a consumer can see.
  entity SupplyRequests as projection on supply.SupplyRequests
    excluding { lastItemNo }
    actions {
      action register() returns SupplyRequests;
      action release()  returns SupplyRequests;
    };

  entity SupplyRequestItems as projection on supply.SupplyRequestItems;

  entity Carriers as projection on supply.Carriers;

  // supply.NumberRanges is deliberately absent: it is the counter behind the
  // register action (plan D-3), not part of the contract.
}
