"use strict";
/* ============ CONSTANTS ============ */
export const TICK=50, SPEED=1.35;
export const RSTAT=[1,2,3.8,7], RINTEG=[1,1.7,2.8,4.5];
export const RNAME=["Bronze","Silver","Gold","Diamond"];
export const BASEINTEG={1:14,2:24,3:38};
export const COST={1:3,2:5,3:8}, SELLV={1:1,2:2,3:3};
export const TIERCOST={2:5,3:7,4:8,5:10,6:11};
export const CATN={dmg:"Weapons",poison:"Poison",burn:"Burn",shield:"Shield",heal:"Heal",util:"Utility"};
export const CATC={dmg:"#c8402e",poison:"#9dbb45",burn:"#e0863a",shield:"#35a596",heal:"#e08a8f",util:"#d8a24a"};
export const BANDN={1:"Back Alleys",2:"The Souk",3:"Palace Quarter"};
export const BANDC={1:"#a8763a",2:"#b9c4d0",3:"#e2ae55"};
export const ANONE={goldMul:1,dmgMul:1,hpMul:1,burnMul:1,poisonMul:1,cdMul:1,shopN:4};
/* ============ ITEMS ============ */
export const ITEMS={
 dagger:{n:"Rusty Dagger",size:1,tier:1,cat:"dmg",cd:3,fx:{dmg:6},d:"A quick jab. Honest work."},
 sword:{n:"Iron Sword",size:1,tier:1,cat:"dmg",cd:3.5,fx:{dmg:11},d:"The backbone of any stall."},
 fangs:{n:"Twin Fangs",size:1,tier:2,cat:"dmg",cd:2,fx:{dmg:9},d:"Fast little bites."},
 mace:{n:"Spiked Mace",size:2,tier:2,cat:"dmg",cd:4.5,fx:{dmg:24},d:"Slow, heavy, convincing."},
 crossbow:{n:"Bazaar Crossbow",size:2,tier:2,cat:"dmg",cd:3,fx:{dmg:15},d:"Steady bolts over the crowd."},
 hammer:{n:"Warhammer",size:3,tier:3,cat:"dmg",cd:5.5,fx:{dmg:42},d:"One swing settles most arguments."},
 serpent:{n:"Serpent Blade",size:1,tier:2,cat:"dmg",cd:3.5,fx:{dmg:6,poison:3},d:"Cuts, then lingers."},
 vial:{n:"Toxin Vial",size:1,tier:1,cat:"poison",cd:3,fx:{poison:2},d:"Poison ignores shields entirely."},
 venom:{n:"Venom Idol",size:3,tier:3,cat:"poison",cd:4.5,fx:{poison:7},d:"An old god of slow endings."},
 torch:{n:"Oil Torch",size:1,tier:1,cat:"burn",cd:3,fx:{burn:3},d:"Burn ticks fade one per second."},
 bomb:{n:"Fire Bomb",size:2,tier:2,cat:"burn",cd:4,fx:{dmg:8,burn:4},d:"A bang, then the smolder."},
 magma:{n:"Magma Heart",size:3,tier:3,cat:"burn",cd:4.5,fx:{burn:10},d:"It never quite cools."},
 buckler:{n:"Round Buckler",size:1,tier:1,cat:"shield",cd:4,fx:{shield:10},d:"Shields absorb hits to your merchant."},
 brassbuckler:{n:"Brass Buckler",size:1,tier:1,cat:"shield",cd:0,bulwark:true,integMul:2.2,fx:{},d:"Bulwark. Enemy weapons must strike this first."},
 barricade:{n:"Stone Barricade",size:2,tier:2,cat:"shield",cd:3,fx:{shield:13},d:"Stacked stones, steady drip."},
 tower:{n:"Tower Shield",size:2,tier:2,cat:"shield",cd:5,fx:{shield:26},d:"A wall you can carry."},
 aegis:{n:"Gilded Aegis",size:3,tier:3,cat:"shield",cd:5.5,fx:{shield:46},d:"Palace craftsmanship."},
 bandage:{n:"Linen Bandage",size:1,tier:1,cat:"heal",cd:4,fx:{heal:12},d:"Heals also cleanse a poison and a burn."},
 salve:{n:"Healing Salve",size:2,tier:2,cat:"heal",cd:4.5,fx:{heal:24},d:"Smells terrible. Works."},
 chalice:{n:"Jade Chalice",size:2,tier:2,cat:"heal",cd:5,fx:{heal:15,shield:15},d:"A sip of both."},
 sanctum:{n:"Rose Sanctum",size:3,tier:3,cat:"heal",cd:5.5,fx:{heal:40},d:"A fountain in a bottle."},
 purse:{n:"Coin Purse",size:1,tier:1,cat:"util",cd:0,inc:2,d:"Earns extra gold each round."},
 ledger:{n:"Merchant Ledger",size:2,tier:2,cat:"util",cd:0,inc:3,d:"Earns extra gold each round."},
 whetstone:{n:"Whetstone",size:1,tier:2,cat:"util",cd:0,adjDmg:3,d:"Adjacent weapons hit harder."},
 hourglass:{n:"Brass Hourglass",size:2,tier:2,cat:"util",cd:4,fx:{haste:0.8},d:"Hastes its neighbors on a rhythm."},
 adren:{n:"Adrenaline Draught",size:2,tier:3,cat:"util",cd:0,cdMul:0.88,d:"Your whole stall runs faster."},
 serpentcrown:{n:"Serpent Crown",size:2,tier:3,cat:"poison",cd:5,fx:{poison:4},unique:true,d:"Shahmaran's bounty. No stall sells it."},
 tidewall:{n:"Tide Wall",size:3,tier:3,cat:"shield",cd:6,fx:{shield:25},unique:true,d:"Marid's bounty. A wall of standing water."},
 weepingstone:{n:"Weeping Stone",size:1,tier:2,cat:"heal",cd:0,regen:1,unique:true,d:"Sandling's bounty. Knits 1 fight health a second."}
};
/* ============ TRINKETS ============ */
export const TRINKETS=[
 {id:"smith",n:"Master Smith",tag:"dmg",g:"g-whetstone",d:"Your weapons strike for +5.",mod:{weaponFlat:5}},
 {id:"sharp",n:"Sharpshooter",tag:"dmg",g:"g-crossbow",d:"Your leftmost item works at double strength.",mod:{firstDouble:true}},
 {id:"venomancer",n:"Venomancer",tag:"poison",g:"g-venom",d:"Your poison is 60% stronger.",mod:{poisonMul:1.6}},
 {id:"pyro",n:"Pyromancer",tag:"burn",g:"g-magma",d:"Your burn is 60% stronger.",mod:{burnMul:1.6}},
 {id:"ironhide",n:"Ironhide Charm",tag:"shield",g:"g-aegis",d:"+30 fight health every battle.",mod:{hpFlat:30}},
 {id:"bulwarkf",n:"Bulwark Faith",tag:"shield",g:"g-brassbuckler",d:"Your shields are half again as strong.",mod:{shieldMul:1.5}},
 {id:"medic",n:"Field Medic",tag:"heal",g:"g-salve",d:"Your healing is half again as strong.",mod:{healMul:1.5}},
 {id:"vamp",n:"Vampiric Trade",tag:"heal",g:"g-chalice",d:"Weapon damage heals you for 15% of it.",mod:{lifesteal:0.15}},
 {id:"quick",n:"Quickhands",tag:"neutral",g:"g-hourglass",d:"Your cooldowns run 12% faster.",mod:{cdMul:0.88}},
 {id:"prince",n:"Merchant Prince",tag:"neutral",g:"g-ledger",d:"+3 gold income each round.",mod:{income:3}}
];
/* ============ ANOMALIES ============ */
export const ANOMALIES=[
 {id:"bull",n:"Bull Market",g:"g-purse",d:"Income is half again as rich for everyone.",m:{goldMul:1.5}},
 {id:"moon",n:"Blood Moon",g:"g-moon",d:"All damage up a third. All merchants frailer.",m:{dmgMul:1.3,hpMul:0.85}},
 {id:"wildfire",n:"Wildfire",g:"g-magma",d:"Every burn in the market is doubled.",m:{burnMul:2}},
 {id:"plague",n:"Plague Winds",g:"g-venom",d:"Every poison in the market is doubled.",m:{poisonMul:2}},
 {id:"molasses",n:"Molasses Night",g:"g-hourglass",d:"All cooldowns run 20% slower.",m:{cdMul:1.2}},
 {id:"overstock",n:"Overstocked",g:"g-ledger",d:"The market shows six wares each round.",m:{shopN:6}},
 {id:"fortified",n:"Fortified",g:"g-tower",d:"All merchants are a third tougher.",m:{hpMul:1.3}},
 {id:"rapid",n:"Rapid Trade",g:"g-adren",d:"All cooldowns run 15% faster.",m:{cdMul:0.85}}
];
/* ============ RIVAL PERSONAS ============ */
export const PERSONAS=[
 {n:"Old Farrokh",p:"p-1",arch:"shield"},
 {n:"Zubaida the Coilwright",p:"p-2",arch:"poison"},
 {n:"Mirza Half-Price",p:"p-3",arch:"util"},
 {n:"The Widow Anahit",p:"p-4",arch:"heal"},
 {n:"Kasra of the Ash Quarter",p:"p-5",arch:"burn"},
 {n:"Bibi Gol",p:"p-6",arch:"dmg"},
 {n:"Tariq Two-Knives",p:"p-7",arch:"dmg"}
];
/* ============ MONSTERS ============ */
export const MONSTERS={
 imp:{n:"Lamp Imp",band:1,hp:40,tag:"burn",glyph:"m-imp",fl:"It steals wicks and grins about it.",
   bounty:{gold:3,items:["dagger"]},
   board:[{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:10,fx:{dmg:4}}]},
 rats:{n:"Bazaar Rats",band:1,hp:45,tag:"dmg",glyph:"m-rats",fl:"Four sets of teeth, one appetite.",
   bounty:{items:["fangs","dagger"]},
   board:[{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}}]},
 ghul:{n:"Rust Ghul",band:1,hp:60,tag:"dmg",glyph:"m-ghul",fl:"Its cleaver hungers for your finest.",
   bounty:{gold:2,items:["brassbuckler"]},
   board:[{nm:"Corroded Cleaver",g:"g-hammer",size:3,cd:9,integ:22,fx:{dmg:18},targeting:"maxinteg"}]},
 samovar:{n:"Scalded Samovar",band:1,hp:50,tag:"burn",glyph:"m-samovar",fl:"The tea is ready. It is furious about it.",
   bounty:{items:["torch"]},
   board:[{nm:"Boiling Spout",g:"g-chalice",size:2,cd:5,integ:18,fx:{burn:3}}]},
 lamassu:{n:"Brass Lamassu",band:2,hp:140,tag:"shield",glyph:"m-lamassu",fl:"Break the wall, or race the chime behind it.",
   bounty:{gold:1,items:["tower"]},
   board:[{nm:"Bulwark Bull",g:"g-brassbuckler",size:3,cd:0,integ:60,fx:{},bulwark:true},{nm:"Horn Chime",g:"g-mace",size:1,cd:4,integ:12,fx:{dmg:9}}]},
 kark:{n:"Karkadann",band:2,hp:160,tag:"dmg",glyph:"m-kark",fl:"One horn. One answer.",
   bounty:{items:["hammer"]},
   board:[{nm:"Gore Horn",g:"g-hammer",size:3,cd:11,integ:30,fx:{dmg:55}}]},
 collector:{n:"The Debt Collector",band:2,hp:110,tag:"util",glyph:"m-debt",fl:"He feeds on the gold in your pocket.",
   bounty:{gold:10,relic:true},special:"gold",
   board:[{nm:"Ledger Blade",g:"g-sword",size:2,cd:5,integ:24,fx:{dmg:6}}]},
 ifrit:{n:"Ifrit of the Kiln",band:3,hp:340,tag:"burn",glyph:"m-ifrit",fl:"The bellows never rest.",
   bounty:{items:["magma"]},
   board:[{nm:"Kiln Heart",g:"g-magma",size:3,cd:7,integ:34,fx:{burn:8}},{nm:"Bellows",g:"g-hourglass",size:2,cd:5,integ:22,fx:{},charge:{t:0,s:2}}]},
 qareen:{n:"Qareen",band:3,hp:0,tag:"util",glyph:"m-qareen",fl:"It wears your face at four fifths strength.",
   bounty:{gild:true},special:"mirror",board:[]},
 shahmaran:{n:"Shahmaran",band:3,hp:350,tag:"poison",glyph:"m-shahmaran",fl:"Half woman, half serpent, all patience.",
   bounty:{items:["serpentcrown"]},
   board:[{nm:"Serpent Crown",g:"g-serpentcrown",size:2,cd:5,integ:24,fx:{poison:4}},{nm:"Coiled Court",g:"g-sanctum",size:2,cd:6,integ:22,fx:{heal:10}}]},
 marid:{n:"Marid of the Cistern",band:3,hp:280,tag:"shield",glyph:"m-marid",fl:"The cistern breathes, and the water answers.",
   bounty:{items:["tidewall"]},
   board:[{nm:"Tide Wall",g:"g-tidewall",size:3,cd:6,integ:36,fx:{shield:25}},{nm:"Spring",g:"g-chalice",size:2,cd:5,integ:22,fx:{heal:12}},{nm:"Drip",g:"g-vial",size:1,cd:3,integ:10,fx:{dmg:4}}]},
 nasnas:{n:"Nasnas",band:2,hp:180,tag:"dmg",glyph:"m-nasnas",fl:"Half of everything, twice as much of it.",
   bounty:{mote:true},
   board:[{nm:"Half Buckler",g:"g-buckler",size:1,cd:4,integ:14,fx:{shield:20}},{nm:"Half Dagger",g:"g-dagger",size:1,cd:3,integ:14,fx:{dmg:12}},{nm:"Half Torch",g:"g-torch",size:1,cd:3,integ:14,fx:{burn:6}},{nm:"Half Vial",g:"g-vial",size:1,cd:3,integ:14,fx:{poison:4}},{nm:"Half Bandage",g:"g-bandage",size:1,cd:4,integ:14,fx:{heal:24}}]},
 matron:{n:"Ghul Matron",band:2,hp:160,tag:"poison",glyph:"m-matron",fl:"She mends as fast as you can cut.",regen:2,
   bounty:{items:["vial","vial"]},
   board:[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:4,integ:24,fx:{poison:3}}]},
 sandling:{n:"Sandling",band:1,hp:90,tag:"heal",glyph:"m-sandling",fl:"It does nothing. Then the sand does everything.",regen:1,stormAt:12,
   bounty:{items:["weepingstone"]},
   board:[]}
};
export const MONBAND={1:["imp","rats","ghul","samovar","sandling"],2:["lamassu","kark","collector","nasnas","matron"],3:["ifrit","qareen","shahmaran","marid"]};
export const MONCHIP={1:2,2:4,3:6};
