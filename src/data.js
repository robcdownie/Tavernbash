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
export const BANDN={1:"Back Alleys",2:"The Souk",3:"Palace Quarter",4:"The Dragon Gate"};
export const BANDC={1:"#a8763a",2:"#b9c4d0",3:"#e2ae55",4:"#c8402e"};
export const ANONE={goldMul:1,dmgMul:1,hpMul:1,burnMul:1,poisonMul:1,cdMul:1,shopN:4};
/* ============ ITEMS ============ */
export const ITEMS={
 dagger:{n:"Rusty Dagger",size:1,tier:1,cat:"dmg",cd:3,fx:{dmg:6},d:"A quick jab. Honest work."},
 sword:{n:"Iron Sword",size:1,tier:1,cat:"dmg",cd:3.5,fx:{dmg:11},d:"The backbone of any stall."},
 fangs:{n:"Twin Fangs",size:1,tier:2,cat:"dmg",cd:2,fx:{dmg:9},d:"Fast little bites."},
 mace:{n:"Spiked Mace",size:2,tier:2,cat:"dmg",cd:4.5,fx:{dmg:24},d:"Slow, heavy, convincing."},
 crossbow:{n:"Souk Crossbow",size:2,tier:2,cat:"dmg",cd:3,fx:{dmg:15},d:"Steady bolts over the crowd."},
 hammer:{n:"Warhammer",size:3,tier:3,cat:"dmg",cd:5.5,fx:{dmg:42},d:"One swing settles most arguments."},
 /* poison trim, approved 2026-07-11: serpent 3 to 2, vial cd 3 to 3.5,
    venom 7 to 5; recorded in the parity test's rebalance ledger */
 serpent:{n:"Serpent Blade",size:1,tier:2,cat:"dmg",cd:3.5,fx:{dmg:6,poison:2},d:"Cuts, then lingers."},
 vial:{n:"Toxin Vial",size:1,tier:1,cat:"poison",cd:3.5,fx:{poison:2},d:"Poison ignores shields entirely."},
 venom:{n:"Venom Idol",size:3,tier:3,cat:"poison",cd:4.5,fx:{poison:5},d:"An old god of slow endings."},
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
 weepingstone:{n:"Weeping Stone",size:1,tier:2,cat:"heal",cd:0,regen:1,unique:true,d:"Sandling's bounty. Knits 1 fight health a second."},
 flyingcharm:{n:"Flying Charm",size:1,tier:2,cat:"util",cd:0,adjFly:true,unique:true,d:"Icebox bounty. Its neighbors fly; weapons cannot reach them."},
 prism:{n:"Glass Prism",size:1,tier:2,cat:"util",cd:0,critAll:0.2,unique:true,d:"Peri's bounty. Your weapons strike double a fifth of the time."},
 rocegg:{n:"Roc Egg",size:2,tier:3,cat:"dmg",cd:0,unique:true,
   rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:20,fx:{dmg:11}}},
   d:"Roc bounty. When it breaks, something angry gets out."},
 feather:{n:"Simurgh Feather",size:1,tier:2,cat:"dmg",cd:2,fx:{dmg:8},flying:true,unique:true,
   d:"Simurgh bounty. It fights from the air; no weapon reaches it."},
 coincannon:{n:"Coin Cannon",size:3,tier:3,cat:"dmg",cd:3,fx:{dmg:14},ammo:5,unique:true,
   d:"Golem bounty. Five shots, then it begs the hopper."},
 coinhopper:{n:"Coin Hopper",size:1,tier:2,cat:"util",cd:8,fx:{reload:2},unique:true,
   d:"Golem bounty. Feeds every dry cannon two coins."},
 azhfang:{n:"Azhdaha Fang",size:2,tier:3,cat:"dmg",cd:4,fx:{dmg:18},unique:true,rattle:{hasteMates:0.5},
   d:"Boss bounty. When it shatters, the rest of your stall rages."},
 gavel:{n:"The Gavel",size:2,tier:3,cat:"dmg",cd:5,fx:{dmg:12,disable:true},unique:true,
   d:"Boss bounty. Sold: the finest enemy ware, out of the fight."},
 /* R8 weapon and item-destruction bridges. Each ware is unique so the
    original shop, rival generation, and combat parity remain untouched. */
 viperverdict:{n:"Viper's Verdict",size:2,tier:3,cat:"dmg",cd:4.5,fx:{dmg:16},unique:true,acquisition:"treasure",
   hooks:[{on:"beforeHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"item"}],
     actions:[{op:"modifyContact",add:{from:"status",side:"enemy",status:"pois",divide:4,floor:true,max:8}}]}],
   d:"Deal 16. Item hits gain +1 damage per 4 enemy poison, up to +8."},
 cinderhook:{n:"Cinderhook Falchion",size:2,tier:3,cat:"dmg",cd:4,fx:{dmg:14},unique:true,acquisition:"treasure",
   hooks:[{on:"afterHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"item"},
     {test:"destroyed"},{test:"contextAtLeast",key:"overkill",value:1},
     {test:"statusAtLeast",side:"enemy",status:"burn",value:1}],actions:[
       {op:"merchantHit",side:"enemy",amount:{from:"context",key:"overkill",multiply:0.35,round:true}},
       {op:"consumeStatus",side:"enemy",status:"burn",amount:1}
     ]}],
   d:"Deal 14. Against a burning foe, 35% of item overkill hits the merchant and consumes 1 burn."},
 brassreclaimer:{n:"Brass Reclaimer",size:3,tier:3,cat:"dmg",cd:5.5,fx:{dmg:30},unique:true,acquisition:"treasure",
   hooks:[{on:"afterHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"item"},
     {test:"destroyed"},{test:"contextAtLeast",key:"overkill",value:1}],actions:[
       {op:"shield",side:"owner",amount:{from:"context",key:"overkill",multiply:0.5,round:true},
        capPerRoot:15,capKey:"reclaimerShield"}
     ]}],
   d:"Deal 30. Item overkill becomes 50% shield, up to 15 per activation."},
 surgeonhook:{n:"Surgeon's Hook",size:1,tier:2,cat:"dmg",cd:3.5,fx:{dmg:7},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"healedWithin",side:"enemy",ms:3000}],
     actions:[{op:"timedDebuff",side:"enemy",id:"wound",duration:4,modifiers:{healReceivedMul:0.75}}]}],
   d:"Deal 7. A foe healed in the last 3 seconds is Wounded for 4 seconds and receives 25% less healing."},
 sapperspick:{n:"Sapper's Pick",size:1,tier:2,cat:"dmg",cd:3,fx:{dmg:6},unique:true,acquisition:"treasure",
   hooks:[
     {on:"beforeHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"merchant"}],
      actions:[{op:"modifyContact",shieldPierce:0.5}]},
     {on:"afterHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"merchant"},
      {test:"contextAtLeast",key:"shieldAbsorbed",value:1}],actions:[{op:"haste",target:"self",amount:0.4}]}
   ],
   d:"Deal 6. Half its merchant damage bypasses shield. Damaging shield charges it 0.4 seconds."},
 blacklotuspress:{n:"Black Lotus Press",size:2,tier:3,cat:"poison",cd:0,fx:{},unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterActivate",when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"poison"}],actions:[
       {op:"haste",target:{side:"owner",category:"dmg",active:true},amount:0.25}
     ]},
     {on:"afterActivate",every:4,when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"poison"}],actions:[
       {op:"poison",targetSide:"enemy",amount:{from:"sourceRarity",values:[1,2,2,3]}}
     ]}
   ],
   d:"Other poison activations charge your leftmost weapon 0.25 seconds. Every fourth also applies 1 poison."},
 serpentsdue:{n:"Serpent's Due",size:3,tier:4,cat:"poison",cd:5.5,fx:{poison:5},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"statusAtLeast",side:"enemy",status:"pois",value:20}],actions:[
     {op:"damage",targetSide:"enemy",amount:{from:"sourceRarity",values:[8,12,18,26]},itemOnly:true,overflow:0,crit:0}
   ]}],
   d:"Apply 5 poison. At 20 enemy poison, deal 8 damage to its leftmost reachable item."},
 antidotethief:{n:"Antidote Thief",size:2,tier:3,cat:"poison",cd:5,fx:{poison:3},unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterCleanse",when:[{test:"eventSideIsEnemy"},{test:"cleansedPoisonAtLeast",value:1}],actions:[
       {op:"stateAdd",key:"cleansedPoison",amount:{from:"context",key:"cleansedPoison"},max:4}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"cleansedPoison",value:1}],actions:[
       {op:"poison",targetSide:"enemy",amount:{from:"state",key:"cleansedPoison",max:4}},
       {op:"stateReset",key:"cleansedPoison"}
     ]}
   ],
   d:"Apply 3 poison, plus poison the enemy cleansed since this last activated, up to 4."},
 venomsiphon:{n:"Venom Siphon",size:1,tier:2,cat:"poison",cd:4,fx:{poison:2},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"statusAtLeast",side:"enemy",status:"pois",value:6}],actions:[
     {op:"heal",side:"owner",amount:{from:"status",side:"enemy",status:"pois",divide:6,floor:true,max:5},quiet:false}
   ]}],
   d:"Apply 2 poison, then heal 1 per 6 enemy poison, up to 5."},
 funeralbrazier:{n:"Funeral Brazier",size:3,tier:4,cat:"burn",cd:0,fx:{},unique:true,acquisition:"treasure",
   hooks:[
     {on:"destroyed",when:{test:"eventSideIsEnemy"},actions:[
       {op:"burn",targetSide:"enemy",amount:{from:"context",key:"victimSize"}}
     ]},
     {on:"destroyed",when:[{test:"eventSideIsEnemy"},{test:"statusAtLeast",side:"enemy",status:"burn",value:10}],actions:[
       {op:"merchantHit",side:"enemy",amount:{from:"sourceRarity",values:[2,3,5,7]}}
     ]}
   ],
   d:"Enemy item destruction applies burn equal to its size. At 10 burn, it also hits the merchant for 2."},
 ashencenser:{n:"Ashen Censer",size:2,tier:3,cat:"burn",cd:4.5,fx:{burn:3},unique:true,acquisition:"treasure",
   hooks:[
     {on:"beforeActivate",when:{test:"actorIsSource"},actions:[
       {op:"removeShield",side:"enemy",amount:8,store:"shieldRemoved"}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"shieldRemoved",value:4}],actions:[
       {op:"burn",targetSide:"enemy",amount:{from:"state",key:"shieldRemoved",divide:4,floor:true,max:2}},
       {op:"stateReset",key:"shieldRemoved"}
     ]}
   ],
   d:"Destroy up to 8 enemy shield. Apply 3 burn, plus 1 per 4 shield destroyed, up to 2."},
 kilnchain:{n:"Kiln Chain",size:1,tier:2,cat:"burn",cd:3.5,fx:{burn:2},unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterActivate",when:{test:"actorIsSource"},actions:[
       {op:"itemStateSet",targets:{side:"owner",category:"dmg",adjacentToSelf:true},key:"ignited",
        value:{from:"sourceRarity",values:[1,2,2,3]}}
     ]},
     {on:"afterActivate",allowDead:true,when:[{test:"actorSideIsOwner"},{test:"actorCategory",value:"dmg"},{test:"actorStateAtLeast",key:"ignited",value:1}],actions:[
       {op:"burn",source:"actor",targetSide:"enemy",amount:{from:"actorState",key:"ignited"}},
       {op:"itemStateReset",source:"actor",target:"actor",key:"ignited"}
     ]}
   ],
   d:"Apply 2 burn. Adjacent weapons become Ignited and apply burn on their next activation."},
 phoenixbell:{n:"Phoenix Bell",size:2,tier:3,cat:"burn",cd:5.5,fx:{burn:3},unique:true,acquisition:"treasure",
   hooks:[
     {on:"destroyed",when:[{test:"eventSideIsOwner"},{test:"victimNotSource"}],actions:[
       {op:"stateAdd",key:"allyDestroyed",amount:1,max:1}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"allyDestroyed",value:1}],actions:[
       {op:"burn",targetSide:"enemy",amount:{from:"sourceRarity",values:[3,5,7,10]}},
       {op:"haste",targets:{side:"owner",category:"burn",active:true,excludeSelf:true},amount:0.5},
       {op:"stateReset",key:"allyDestroyed"}
     ]}
   ],
   d:"Apply 3 burn. An allied item death adds 3 burn and charges every other burn ware 0.5 seconds."},
 coinplatedram:{n:"Coin-Plated Ram",size:3,tier:3,cat:"shield",cd:5,fx:{shield:18},unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterActivate",when:{test:"actorIsSource"},actions:[
       {op:"itemStateSet",targets:{side:"owner",category:"dmg",active:true},key:"shieldSpend",value:8}
     ]},
     {on:"beforeHit",allowDead:true,when:[{test:"actorSideIsOwner"},{test:"actorCategory",value:"dmg"},
       {test:"actorStateAtLeast",key:"shieldSpend",value:1}],actions:[
       {op:"spendShieldForDamage",source:"actor",side:"owner",key:"shieldSpend"}
     ]}
   ],
   d:"Gain 18 shield. Your leftmost weapon's next attack spends up to 8 shield for equal bonus damage."},
 mirrorbastion:{n:"Mirror Bastion",size:3,tier:4,cat:"shield",cd:6,fx:{shield:24},unique:true,acquisition:"treasure",
   hooks:[{on:"afterHit",oncePerMs:1000,when:[{test:"eventSideIsOwner"},{test:"contextAtLeast",key:"shieldAbsorbed",value:1}],actions:[
     {op:"haste",target:{side:"owner",active:true,position:"rightmost"},amount:0.35}
   ]}],
   d:"Gain 24 shield. Once per second, shield absorption charges your rightmost active ware 0.35 seconds."},
 saltward:{n:"Salt Ward",size:1,tier:2,cat:"shield",cd:4,fx:{shield:8},unique:true,acquisition:"treasure",
   hooks:[
     {on:"beforeActivate",when:{test:"actorIsSource"},actions:[
       {op:"cleanseStatus",side:"owner",status:"pois",amount:2,store:"poisonCleansed"}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"poisonCleansed",value:1}],actions:[
       {op:"shield",side:"owner",amount:{from:"sourceRarity",values:[4,6,9,13]}},
       {op:"stateReset",key:"poisonCleansed"}
     ]}
   ],
   d:"Gain 8 shield and cleanse 2 poison. Cleansing any poison grants 4 more shield."},
 breakwaterbuckler:{n:"Breakwater Buckler",size:2,tier:3,cat:"shield",cd:4.5,fx:{shield:14},unique:true,acquisition:"treasure",
   hooks:[
     {on:"beforeActivate",when:{test:"actorIsSource"},actions:[
       {op:"cleanseStatus",side:"owner",status:"burn",amount:2,store:"burnCleansed"}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"burnCleansed",value:1}],actions:[
       {op:"shield",side:"owner",amount:{from:"sourceRarity",values:[4,6,9,13]}}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"burnCleansed",value:2}],actions:[
       {op:"shield",side:"owner",amount:{from:"sourceRarity",values:[4,6,9,13]}}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"burnCleansed",value:1}],actions:[
       {op:"stateReset",key:"burnCleansed"}
     ]}
   ],
   d:"Gain 14 shield. Remove up to 2 own burn and gain 4 more shield for each removed."},
 rosewaterpump:{n:"Rosewater Pump",size:2,tier:2,cat:"heal",cd:4.5,fx:{heal:12},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[
     {op:"haste",target:{side:"owner",category:"dmg",active:true},amount:0.75}
   ]}],
   d:"Heal 12 and charge your leftmost living weapon 0.75 seconds."},
 chirurgeonsscissors:{n:"Chirurgeon's Scissors",size:1,tier:2,cat:"heal",cd:3.5,fx:{heal:7},cleanseTotal:2,unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterCleanse",when:[{test:"actorIsSource"},{test:"contextAtLeast",key:"cleansedTotal",value:1}],actions:[
       {op:"stateSet",key:"nextOtherHeal",value:{from:"sourceRarity",values:[3,5,7,10]}}
     ]},
     {on:"beforeHeal",allowDead:true,when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},
       {test:"stateAtLeast",key:"nextOtherHeal",value:1}],actions:[
       {op:"modifyHeal",source:"actor",add:{from:"state",key:"nextOtherHeal"}},
       {op:"stateReset",source:"actor",key:"nextOtherHeal"}
     ]}
   ],
   d:"Heal 7 and cleanse 2 from the larger status. A cleanse adds 3 to the next other item heal."},
 bloodpricechalice:{n:"Blood Price Chalice",size:3,tier:4,cat:"heal",cd:6,fx:{heal:24},unique:true,acquisition:"treasure",
   hooks:[{on:"afterHeal",when:[{test:"actorIsSource"},{test:"contextAtLeast",key:"overheal",value:1}],actions:[
     {op:"shield",side:"owner",amount:{from:"context",key:"overheal",multiply:0.75,round:true,max:18}}
   ]}],
   d:"Heal 24. Convert 75% of overhealing into shield, up to 18 per activation."},
 mendersbell:{n:"Mender's Bell",size:2,tier:3,cat:"heal",cd:0,fx:{},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",every:3,when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"heal"}],actions:[
     {op:"repair",target:{side:"owner",position:"lowestIntegrity",excludeSelf:true},amount:{from:"sourceRarity",values:[10,15,23,33]}}
   ]}],
   d:"Every third other heal activation repairs 10 Integrity to your lowest-Integrity living ware."},
 smoketaxstamp:{n:"Smoke Tax Stamp",size:1,tier:2,cat:"util",cd:0,fx:{},incomeByRarity:[1,2,3,4],unique:true,acquisition:"treasure",
   hooks:[{on:"beforeHeal",when:{test:"eventSideIsEnemy"},actions:[
     {op:"modifyHeal",mul:0.8}
   ]}],
   d:"After each combat victory, gain 1 gold. While alive, enemy healing is reduced by 20%."},
 peacebinderchain:{n:"Peacebinder Chain",size:2,tier:3,cat:"util",cd:5,fx:{},unique:true,acquisition:"treasure",
   hooks:[
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"itemExists",selector:{side:"enemy",damageOnly:true,position:"highestDamage"}}],actions:[
       {op:"disarm",target:{side:"enemy",damageOnly:true,position:"highestDamage"},duration:2}
     ]},
     {on:"afterActivate",when:[{test:"actorIsSource"},{test:"itemMissing",selector:{side:"enemy",damageOnly:true,position:"highestDamage"}}],actions:[
       {op:"haste",targets:{side:"owner",active:true,adjacentToSelf:true},amount:0.5}
     ]}
   ],
   d:"Disarm the enemy's highest printed damage ware for 2 seconds. With none, charge adjacent allies 0.5 seconds."},
 gravebell:{n:"Grave Bell",size:1,tier:3,cat:"util",cd:0,fx:{},unique:true,acquisition:"treasure",
   hooks:[
     {on:"destroyed",when:[{test:"eventSideIsOwner"},{test:"victimNotSource"},{test:"victimHasRattle"}],actions:[
       {op:"shield",side:"owner",amount:{from:"sourceRarity",values:[6,9,14,20]}}
     ]},
     {on:"afterSpawn",when:[{test:"eventSideIsOwner"},{test:"contextAtLeast",key:"fromRattle",value:1}],actions:[
       {op:"setTimerFraction",target:"target",value:0.5}
     ]}
   ],
   d:"Allied rattles grant 6 shield. Their spawned replacements begin half charged."},
 bazaarcompass:{n:"Bazaar Compass",size:2,tier:3,cat:"util",cd:0,fx:{},unique:true,acquisition:"treasure",
   hooks:[{on:"afterActivate",oncePerContext:"actorCategory",when:[{test:"actorSideIsOwner"},{test:"actorNotSource"}],actions:[
     {op:"haste",targets:{side:"owner",active:true,differentActorCategory:true,excludeSelf:true},amount:0.2}
   ]}],
   d:"The first other activation of each category charges every active ware of a different category 0.2 seconds."}
};
/* ============ HEROES ============ */
/* Picked at run start. The personal tag weights your shop like a lobby
   featured tag; mods merge into the trinket aggregate; a start id lands
   on the board before round 1. */
export const HERO_SHOP_WEIGHT=1.5, FEATURED_SHOP_WEIGHT=2.2;
export function shopTagWeight(category,featuredTags,heroTag){
 let weight=1;
 if((featuredTags||[]).indexOf(category)>=0)weight=Math.max(weight,FEATURED_SHOP_WEIGHT);
 if(heroTag===category)weight=Math.max(weight,HERO_SHOP_WEIGHT);
 return weight;
}
export function heroCreditLimit(hero){return hero&&hero.mod&&hero.mod.creditLimit||0;}
export function canSpendGold(gold,cost,hero){return gold-cost>=-heroCreditLimit(hero);}
export const HEROES=[
 {id:"kiln",n:"The Kilnkeeper",tag:"burn",g:"h-kiln",d:"Last Light: your leftmost Burn ware gains Bulwark and activates once before its first destruction.",start:"torch",mod:{leftmostBurnLastLight:true},
  barks:{forge:["Three become one. The kiln approves.","Now that is proper heat."],
         win:["The fire held.","Ash on their side of the street."],
         loss:["Smoke stings. We stoke again.","Even kilns crack. Patch it and burn on."],
         boss:["That gate breathes like a furnace. Mind yourself."],
         broke:["Empty purse, warm forge. Priorities."]}},
 {id:"apoth",n:"The Apothecary",tag:"heal",g:"h-apoth",d:"No Medicine Wasted: overhealing becomes Shield, but healing no longer cleanses Poison or Burn.",mod:{overhealToShield:true,healingCleanses:false},
  barks:{forge:["Distilled to its essence.","Three doses become a cure."],
         win:["The remedy took.","Steady hands, steady heart."],
         loss:["A bitter draught. Note the dose.","We survive worse every day."],
         boss:["I smell ash beyond that gate. Bring bandages."],
         broke:["Spent to the last drop."]}},
 {id:"knife",n:"The Knifegrinder",tag:"dmg",g:"h-knife",d:"Perfect Edge: your leftmost weapon has full overflow. A failed kill adds 1 second to its next cooldown.",mod:{leftmostWeaponPerfectEdge:true},
  barks:{forge:["Three blades, one edge. Efficient.","The wheel sings tonight."],
         win:["Clean cut.","They will feel that one tomorrow."],
         loss:["Nicked. It happens.","Dull night. Sharpen and return."],
         boss:["Big door. Bigger target."],
         broke:["Gold dulls. Steel does not."]}},
 {id:"lender",n:"The Moneylender",tag:"util",g:"h-lender",d:"Credit Is Gold: spend to -3 gold. Debt blocks rerolls and the next reward repays it first.",mod:{creditLimit:3,debtLobbyDamage:2,rerollBlockedInDebt:true},
  barks:{forge:["Consolidation! I love consolidation.","Three small debts, one great asset."],
         win:["Profit!","The ledger smiles on us tonight."],
         loss:["A write down. Painful, survivable.","We book the loss and move on."],
         boss:["Careful. That gate charges interest."],
         broke:["We are, how to say it, illiquid."]}},
 {id:"venom",n:"The Venom Broker",tag:"poison",g:"h-venom",d:"Marked for Collection: your Poison marks enemy wares, damages them each second, then spills to the merchant when they break.",mod:{poisonTargetsItems:true,poisonSpillsOnDestroy:true},
  barks:{forge:["A stronger claim on the marked."],win:["Collection complete."],loss:["The mark escaped us."],boss:["Even kings owe their due."],broke:["No coin. Plenty of leverage."]}},
 {id:"architect",n:"The Brass Architect",tag:"shield",g:"h-architect",d:"Living Rampart: your leftmost Shield ware gains Bulwark and stores its own Shield until it falls.",mod:{leftmostShieldBulwark:true,leftmostShieldStoresOnSelf:true,transferItemShieldOnDeath:true},
  barks:{forge:["The joins will hold."],win:["A sound foundation."],loss:["Rebuild from the true line."],boss:["Every gate has a weak arch."],broke:["Brass can wait. Measure first."]}},
 {id:"silkblade",n:"The Silkblade",tag:"dmg",g:"h-silkblade",d:"Measure Twice, Strike Once: your fastest weapon alternates a guaranteed critical activation with a skipped one.",mod:{fastestWeaponAlternatingCrit:true},
  barks:{forge:["One edge, no hesitation."],win:["The second measure was enough."],loss:["My rhythm broke."],boss:["Wait for the opening."],broke:["Patience costs nothing."]}},
 {id:"ash",n:"The Ash Collector",tag:"util",g:"h-ash",d:"One True Funeral: only your first rattle resolves each fight. It resolves twice and all later rattles are suppressed.",mod:{oneTrueFuneral:true},
  barks:{forge:["Ash remembers every shape."],win:["One funeral was enough."],loss:["The wrong flame went first."],boss:["Choose what the pyre will honor."],broke:["The dead leave no invoices."]}}
];
/* ============ ENCHANTS ============ */
/* need: "dmg" requires a damage effect, "cd" requires an active cooldown,
   null fits any ware. Riders are applied in playerFightItems; rivals
   never roll enchants, so fight parity holds. */
export const ENCH={
 fiery:{n:"Blazing",c:"#e0863a",need:"dmg",d:"Adds burn equal to a third of its damage."},
 venomous:{n:"Venomous",c:"#9dbb45",need:"cd",d:"Adds poison with every activation."},
 icy:{n:"Frosted",c:"#9ad8ef",need:"cd",d:"Its first strike freezes the enemy's leftmost ware for 2 s."},
 stout:{n:"Stout",c:"#b9c4d0",need:null,d:"Integrity raised by 60%."},
 swift:{n:"Swift",c:"#f4cf7c",need:"cd",d:"Cooldown 15% faster."},
 winged:{n:"Winged",c:"#e8eef4",need:null,d:"It flies; enemy weapons cannot reach it."}
};
export const ENCH_CHANCE=0.12, ENCH_PREMIUM=3;
/* ============ TRINKETS ============ */
export const TRINKETS=[
 {id:"smith",n:"Master Smith",tag:"dmg",g:"g-whetstone",d:"Your weapons strike for +5.",mod:{weaponFlat:5}},
 {id:"sharp",n:"Sharpshooter",tag:"dmg",g:"g-crossbow",d:"Your leftmost item works at double strength.",mod:{firstDouble:true}},
 {id:"venomancer",n:"Poisonmonger",tag:"poison",g:"g-venom",d:"Your poison is 60% stronger.",mod:{poisonMul:1.6}},
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
 rats:{n:"Souk Rats",band:1,hp:45,tag:"dmg",glyph:"m-rats",fl:"Four sets of teeth, one appetite.",
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
 /* moved from band 2, approved 2026-07-11: on-curve band 2 boards beat
    it only 31% of the time; its double-stat court belongs in band 3 */
 nasnas:{n:"Nasnas",band:3,hp:180,tag:"dmg",glyph:"m-nasnas",fl:"Half of everything, twice as much of it.",
   bounty:{mote:true},
   board:[{nm:"Half Buckler",g:"g-buckler",size:1,cd:4,integ:14,fx:{shield:20}},{nm:"Half Dagger",g:"g-dagger",size:1,cd:3,integ:14,fx:{dmg:12}},{nm:"Half Torch",g:"g-torch",size:1,cd:3,integ:14,fx:{burn:6}},{nm:"Half Vial",g:"g-vial",size:1,cd:3,integ:14,fx:{poison:4}},{nm:"Half Bandage",g:"g-bandage",size:1,cd:4,integ:14,fx:{heal:24}}]},
 matron:{n:"Ghul Matron",band:2,hp:160,tag:"poison",glyph:"m-matron",fl:"She mends as fast as you can cut.",regen:2,
   bounty:{items:["vial","vial"]},
   board:[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:4,integ:24,fx:{poison:3}}]},
 sandling:{n:"Sandling",band:1,hp:90,tag:"heal",glyph:"m-sandling",fl:"It does nothing. Then the sand does everything.",regen:1,stormAt:12,
   bounty:{items:["weepingstone"]},
   board:[]},
 monkey:{n:"Pilfer Monkey",band:1,hp:60,tag:"util",glyph:"m-monkey",fl:"It fights for tips.",
   bounty:{gold:8,drain:true},
   board:[{nm:"Sticky Paws",g:"g-purse",size:1,cd:3,integ:14,fx:{dmg:3},pocket:1}]},
 icebox:{n:"The Icebox",band:2,hp:170,tag:"util",glyph:"m-icebox",fl:"Cold storage, with opinions.",
   bounty:{items:["flyingcharm"]},
   board:[{nm:"Cold Shank",g:"g-dagger",size:1,cd:4,integ:14,fx:{dmg:7}},{nm:"Frost Vent",g:"g-tower",size:2,cd:6,integ:45,fx:{freeze:3}}]},
 peri:{n:"Glass Peri",band:2,hp:110,tag:"dmg",glyph:"m-peri",fl:"Beautiful. Sharp. Briefly.",
   bounty:{items:["prism"]},
   board:[{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:6,fx:{dmg:5},crit:0.35},{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:6,fx:{dmg:5},crit:0.35},{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:6,fx:{dmg:5},crit:0.35}]},
 roc:{n:"Roc Egg",band:3,hp:250,tag:"dmg",glyph:"m-roc",fl:"Do not tap the shell.",
   bounty:{items:["rocegg"]},
   board:[{nm:"The Egg",g:"g-rocegg",size:3,cd:15,integ:80,fx:{},selfdestruct:true,
     rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:30,fx:{dmg:22}}}}]},
 simurgh:{n:"Simurgh Fledgling",band:3,hp:300,tag:"dmg",glyph:"m-simurgh",fl:"Half fledged, twice quick.",
   bounty:{items:["feather"]},
   board:[{nm:"Tail Feather",g:"g-feather",size:1,cd:2,integ:12,fx:{dmg:8}},{nm:"Preen",g:"g-hatchling",size:2,cd:6,integ:24,fx:{hasteAll:2}}]},
 golem:{n:"Mint Golem",band:3,hp:320,tag:"dmg",glyph:"m-golem",fl:"It pays out in bruises.",
   bounty:{items:["coincannon","coinhopper"]},
   board:[{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:3,integ:38,fx:{dmg:14},ammo:5},{nm:"Coin Hopper",g:"g-coinhopper",size:1,cd:8,integ:14,fx:{reload:2}}]},
 azhdaha:{n:"The Azhdaha",band:4,hp:550,tag:"dmg",glyph:"m-azhdaha",fl:"Cut one head. Ask the other two.",
   bounty:{items:["azhfang"],gold:5},
   board:[{nm:"First Head",g:"g-azhfang",size:3,cd:8,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}},
          {nm:"Second Head",g:"g-azhfang",size:3,cd:8,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}},
          {nm:"Third Head",g:"g-azhfang",size:3,cd:8,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}}]},
 auctioneer:{n:"Night Auctioneer",band:4,hp:500,tag:"util",glyph:"m-auctioneer",fl:"Everything must go. Including yours.",
   bounty:{items:["gavel"]},
   board:[{nm:"The Gavel",g:"g-gavel",size:2,cd:5,integ:40,fx:{dmg:12}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:6,integ:14,fx:{disable:true},pay:3,flying:true}]},
 vizier:{n:"Grand Vizier of Ash",band:4,hp:700,tag:"burn",glyph:"m-vizier",fl:"The city burned. He kept the receipts.",
   bounty:{pickUnique:true},
   board:[{nm:"Ash Bulwark",g:"g-brassbuckler",size:3,cd:0,integ:90,fx:{},bulwark:true},
          {nm:"Cinder Core",g:"g-magma",size:3,cd:4.5,integ:40,fx:{burn:12}},
          {nm:"Frost Scepter",g:"g-tidewall",size:2,cd:7,integ:36,fx:{freeze:3}},
          {nm:"Ash Chalice",g:"g-chalice",size:2,cd:5,integ:36,fx:{heal:20}}]}
};
export const MONBAND={1:["imp","rats","ghul","samovar","sandling","monkey"],2:["lamassu","kark","collector","matron","icebox","peri"],3:["ifrit","qareen","shahmaran","marid","roc","simurgh","golem","nasnas"],4:["azhdaha","auctioneer","vizier"]};
export const MONCHIP={1:2,2:4,3:6,4:8};
/* The Long Bazaar route layer. Districts define the run's four stages: which
   monsters fill their normal and elite doors, the fixed boss, the map-depth to
   engine Threat mapping (fed to fightHP and stormAt), and the Slip Past cost in
   Resolve. This deliberately differs from the legacy MONBAND/band grouping; the
   route uses these tables, combat still reads MONSTERS for stats. Threat: early
   is columns 1 to 2, late is columns 3 to 5, boss is its own value. */
export const DISTRICTS=[
 {id:1,name:"Back Alleys",boss:"matron",threatEarly:1,threatLate:2,threatBoss:3,slip:3,
  normals:["imp","rats","samovar","sandling","monkey"],elites:["ghul"]},
 {id:2,name:"The Souk",boss:"collector",threatEarly:4,threatLate:5,threatBoss:6,slip:5,
  normals:["lamassu","icebox","peri","nasnas"],elites:["kark"]},
 {id:3,name:"Palace Quarter",boss:"ifrit",threatEarly:7,threatLate:8,threatBoss:9,slip:7,
  normals:["qareen","roc","simurgh"],elites:["shahmaran","marid","golem"]},
 {id:4,name:"The Dragon Gate",boss:"vizier",threatEarly:10,threatLate:11,threatBoss:12,slip:0,
  normals:[],elites:["azhdaha","auctioneer"]}
];
