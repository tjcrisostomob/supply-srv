namespace supply;

using { cuid } from '@sap/cds/common';

// Stored in Spanish on purpose (plan D-7): these values are the contract
// consumers filter on (RF-48), not user-facing message text.
type RequestStatus : String(10) enum {
  DRAFT      = 'BORRADOR';
  REGISTERED = 'REGISTRADA';
  RELEASED   = 'LIBERADA';
}

entity SupplyRequests : cuid {
  requestNo   : Integer;                      // null until registered (RF-7)
  description : String(200);                  // optional in every state (RF-3)
  status      : RequestStatus default #DRAFT;
  carrier     : Association to Carriers @assert.target;
  items       : Composition of many SupplyRequestItems
                  on items.request = $self;
  // Technical counter, never decremented, so a deleted item number is never
  // handed out again (RF-24). Excluded from the service projection in T-04.
  lastItemNo  : Integer default 0;
}

entity SupplyRequestItems : cuid {
  request  : Association to SupplyRequests;
  itemNo   : Integer;                         // assigned by the system (RF-23)
  material : String(40);
  quantity : Decimal(13, 3);
  unit     : String(3);
}

entity Carriers {
  key code  : String(10);                     // business key, immutable (RF-37)
      name  : String(100) @mandatory;
      phone : String(30);
      email : String(100);
}

// Internal counter table, not part of the service contract (plan D-3).
entity NumberRanges {
  key name      : String(20);
      nextValue : Integer;
}
