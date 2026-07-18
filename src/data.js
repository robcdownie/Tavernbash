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
 /* R8 weapon and item-destruction bridges. Tier-2 combat glue joins the
    normal shop and fusion economy; higher-tier engines stay Treasure-only. */
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
 surgeonhook:{n:"Surgeon's Hook",size:1,tier:2,cat:"dmg",cd:3.5,fx:{dmg:7},acquisition:"shop",
   hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"healedWithin",side:"enemy",ms:3000}],
     actions:[{op:"timedDebuff",side:"enemy",id:"wound",duration:4,modifiers:{healReceivedMul:0.75}}]}],
   d:"Deal 7. A foe healed in the last 3 seconds is Wounded for 4 seconds and receives 25% less healing."},
 sapperspick:{n:"Sapper's Pick",size:1,tier:2,cat:"dmg",cd:3,fx:{dmg:6},acquisition:"shop",
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
 venomsiphon:{n:"Venom Siphon",size:1,tier:2,cat:"poison",cd:4,fx:{poison:2},acquisition:"shop",
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
 kilnchain:{n:"Kiln Chain",size:1,tier:2,cat:"burn",cd:3.5,fx:{burn:2},acquisition:"shop",
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
 saltward:{n:"Salt Ward",size:1,tier:2,cat:"shield",cd:4,fx:{shield:8},acquisition:"shop",
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
 rosewaterpump:{n:"Rosewater Pump",size:2,tier:2,cat:"heal",cd:4.5,fx:{heal:12},acquisition:"shop",
   hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[
     {op:"haste",target:{side:"owner",category:"dmg",active:true},amount:0.75}
   ]}],
   d:"Heal 12 and charge your leftmost living weapon 0.75 seconds."},
 chirurgeonsscissors:{n:"Chirurgeon's Scissors",size:1,tier:2,cat:"heal",cd:3.5,fx:{heal:7},cleanseTotal:2,acquisition:"shop",
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
 {id:"prince",n:"Merchant Prince",tag:"neutral",g:"g-ledger",d:"After each combat victory, gain +3 gold.",mod:{income:3}}
];
/* ============ ANOMALIES ============ */
export const ANOMALIES=[
 {id:"bull",n:"Bull Market",g:"g-purse",d:"Income is increased by 50%, but every shop ware costs 1 additional gold.",m:{goldMul:1.5,shopItemCostFlat:1}},
 {id:"moon",n:"Blood Moon",g:"g-moon",d:"Weapon damage is increased by 30%. Healing, regeneration, and lifesteal are disabled.",m:{dmgMul:1.3,healingDisabled:true}},
 {id:"wildfire",n:"Wildfire",g:"g-magma",d:"Burn applications are doubled. Any Heal activation removes all Burn before restoring health.",m:{burnMul:2,healClearsAllBurn:true}},
 {id:"plague",n:"Plague Winds",g:"g-venom",d:"Poison applications are doubled, but Poison loses half its stacks after every tick.",m:{poisonMul:2,poisonDecayAfterTick:0.5}},
 {id:"molasses",n:"Molasses Night",g:"g-hourglass",d:"All cooldowns are 20% slower. Wares with a base cooldown of at least 5 seconds begin fully charged.",m:{cdMul:1.2,startFullyChargedIfBaseCdAtLeast:5000}},
 {id:"overstock",n:"Overstocked",g:"g-ledger",d:"Markets show six wares, but rerolls cost 2 gold.",m:{shopN:6,rerollCost:2}},
 {id:"fortified",n:"Fortified",g:"g-tower",d:"Merchants have 30% more Fight Health, but the storm begins 5 seconds earlier.",m:{hpMul:1.3,stormStartOffsetMs:-5000}},
 {id:"rapid",n:"Rapid Trade",g:"g-adren",d:"Cooldowns are 15% faster, but every activation damages its ware for 5% of maximum integrity.",m:{cdMul:0.85,activationSelfDamagePct:0.05}},
 {id:"narrow",n:"Narrow Alleys",g:"g-bazaarcompass",d:"Every merchant has two fewer board slots, but Large wares occupy two slots instead of three.",m:{slotCountFlat:-2,sizeCostOverride:{3:2}}},
 {id:"glass",n:"Glass Night",g:"g-prism",d:"All wares have 40% less integrity. The first rattle triggered by each side resolves twice.",m:{itemIntegrityMul:0.6,firstDeathrattleDouble:true}},
 {id:"silent",n:"Silent Bazaar",g:"g-peacebinderchain",d:"Rerolls are disabled. Markets show six wares, and frozen wares remain through two market rolls.",m:{shopN:6,rerollDisabled:true,freezeDurationRounds:2}},
 {id:"auctionbell",n:"The Auction Bell",g:"g-gavel",d:"Wares sell for full base cost, but each sale raises reroll cost by 1 for the rest of that market.",m:{sellReturnsBaseCost:true,rerollCostPerSaleThisMarket:1}}
];
/* ============ THE LANTERN ============ */
/* The post-clear difficulty ladder (design-lantern-0.89.md). Cumulative: at
   level N every entry lv <= N is active. Config only; the engine never reads
   this table. L8 monsterGildChance and L9 vaultSlots are draft values pending
   the Codex second look. */
export const LANTERN=[
 {lv:1,n:"Trimmed Wick",d:"Every monster and elite door fights at 10 percent greater strength. Bosses and the Dragon Gate hold their old fire.",doorPowerMul:1.10},
 {lv:2,n:"Thin Oil",d:"Bargains that pay out gold on the spot pay 2 less.",directEventGoldFlat:-2},
 {lv:3,n:"The Toll Lantern",d:"Every lost fight in the districts costs 2 more Resolve. The Dragon Gate exacts only its usual toll.",lossChipFlat:2},
 {lv:4,n:"Oil on the Wind",d:"The simoom rises 2 seconds earlier in every fight outside the Dragon Gate.",stormStartOffsetMs:-2000},
 {lv:5,n:"Shadow Souk",d:"Every market shows one fewer ware.",shopNFlat:-1},
 {lv:6,n:"No Frost Tonight",d:"The market frost fails: wares left on the shelf are lost to the next roll. Under a Silent Bazaar Omen the frost holds.",freezeDisabled:true},
 {lv:7,n:"Gilded Teeth",d:"Every elite in the districts stands gilded. The Dragon Gate keeps its own counsel.",eliteGilded:true},
 {lv:8,n:"Gilded Streets",d:"Gold runs through every alley: nearly half the monster doors stand gilded.",monsterGildChance:0.45},
 {lv:9,n:"The Locked Shelf",d:"The Vault's third shelf is locked for the night: it holds two wares, not three.",vaultSlots:2},
 {lv:10,n:"The Last Drop of Oil",d:"You begin the night with the last of the oil: 34 Resolve on Quick Night, 50 on The Long Bazaar.",startResolve:{quick:34,long:50}}
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
 collector:{n:"The Debt Collector",band:2,hp:200,tag:"util",glyph:"m-debt",fl:"He feeds on the gold in your pocket.",
   bounty:{gold:10,relic:true},special:"gold",
   board:[{nm:"Ledger Blade",g:"g-sword",size:2,cd:5,integ:24,fx:{dmg:6}}]},
 ifrit:{n:"Ifrit of the Kiln",band:3,hp:500,tag:"burn",glyph:"m-ifrit",fl:"The bellows never rest.",
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
   board:[{nm:"First Head",g:"g-azhfang",size:3,cd:12,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}},
          {nm:"Second Head",g:"g-azhfang",size:3,cd:12,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}},
          {nm:"Third Head",g:"g-azhfang",size:3,cd:12,integ:50,fx:{dmg:20},rattle:{hasteMates:0.5}}]},
 auctioneer:{n:"Night Auctioneer",band:4,hp:500,tag:"util",glyph:"m-auctioneer",fl:"Everything must go. Including yours.",
   bounty:{items:["gavel"]},
   board:[{nm:"The Gavel",g:"g-gavel",size:2,cd:5,integ:40,fx:{dmg:12}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:6,integ:14,fx:{disable:true},pay:3,flying:true}]},
 vizier:{n:"Grand Vizier of Ash",band:4,hp:700,tag:"burn",glyph:"m-vizier",fl:"The city burned. He kept the receipts.",
   bounty:{pickUnique:true},
   board:[{nm:"Ash Bulwark",g:"g-brassbuckler",size:3,cd:0,integ:90,fx:{},bulwark:true},
          /* 0.88.0: a small direct hit so the Gavel's auction has a lawful target
             in the Vizier fight (disable wants fx.dmg); burn eased 12 to 10 so the
             head-to-head stays where the harness had it */
          {nm:"Cinder Core",g:"g-magma",size:3,cd:4.5,integ:40,fx:{dmg:6,burn:10}},
          {nm:"Frost Scepter",g:"g-tidewall",size:2,cd:7,integ:36,fx:{freeze:3}},
          {nm:"Ash Chalice",g:"g-chalice",size:2,cd:5,integ:36,fx:{heal:20}}]}
};
/* ============ MONSTER ASPECTS (0.95.0 board variance) ============ */
/* Every base monster gains two data-only board Aspects: the same name, glyph,
   band, tag, hp, and signature mechanic, a different board (mix, order, or
   timing). A stateless hash of the run seed and node id (aspectMonId in
   aspects.js) picks one at fight-build time; variant 0 is always the shipped
   board, reachable one time in three. Aspects carry NO bounty: rewards read the
   base id (route.js), so variance never forks the economy. Aspect keys never
   enter MONBAND, DISTRICTS, or the map, so door pools and genMap are untouched;
   they exist only as construction data monsterSide reads by id. The helper
   copies the boilerplate (n, band, tag, glyph, hp, and any special/regen/stormAt)
   from the base so an Aspect cannot drift from its creature; the board is the
   only hand-authored literal, plus regen/stormAt overrides in `extra`.
   Retunes vs design-monster-variance.md, from the independent gilded sim pass
   folded into the doc and re-traced here 2026-07-17: rats_v2 base dmg 1 to 2 (so
   gild bites the swarm), kark_v1 charge s 2 to 1 (the gilded charge was too hard),
   matron_v1 regen 3 to 2 (the gilded sustain race was outside the boss band). */
function aspect(base,vn,board,extra){
  const M=MONSTERS[base];
  const e={n:M.n,band:M.band,tag:M.tag,glyph:M.glyph,hp:M.hp,variantOf:base,vn:vn,board:board};
  if(M.special!=null)e.special=M.special;
  if(M.regen!=null)e.regen=M.regen;
  if(M.stormAt!=null)e.stormAt=M.stormAt;
  return Object.assign(e,extra||{});
}
Object.assign(MONSTERS,{
 /* District 1, Back Alleys */
 imp_v1:aspect("imp","Twin Wicks",[{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:8,fx:{dmg:3}},{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:8,fx:{dmg:3}}]),
 imp_v2:aspect("imp","Wick Thief",[{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:10,fx:{dmg:3}},{nm:"Stolen Wick",g:"g-torch",size:1,cd:4,integ:10,fx:{dmg:2,burn:1}}]),
 rats_v1:aspect("rats","The Fat One",[{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"The Fat One",g:"g-mace",size:2,cd:3.5,integ:20,fx:{dmg:5}}]),
 /* retuned: the doc proposed dmg 1 to 2, but the build-time trace showed five
    dmg-2 bodies overshoot to roughly minus 26 gilded (harder than the shipped
    rats, already the sharpest normal-door cliff). dmg 2 cannot land a five-body
    swarm in band under gild; the in-band swarm is five faster, slightly meatier
    dmg-1 bodies (cd 2, integ 7), which traces at +0/+0 plain and gilded. */
 rats_v2:aspect("rats","The Swarm",[{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2,integ:7,fx:{dmg:1}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2,integ:7,fx:{dmg:1}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2,integ:7,fx:{dmg:1}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2,integ:7,fx:{dmg:1}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2,integ:7,fx:{dmg:1}}]),
 ghul_v1:aspect("ghul","Patient Cleaver",[{nm:"Corroded Cleaver",g:"g-hammer",size:3,cd:12,integ:22,fx:{dmg:26},targeting:"maxinteg"}]),
 ghul_v2:aspect("ghul","Rusted Pair",[{nm:"Rusted Hatchet",g:"g-hammer",size:2,cd:8,integ:14,fx:{dmg:9},targeting:"maxinteg"},{nm:"Rusted Hatchet",g:"g-hammer",size:2,cd:8,integ:14,fx:{dmg:9},targeting:"maxinteg"}]),
 samovar_v1:aspect("samovar","Double Boiler",[{nm:"Boiling Spout",g:"g-chalice",size:1,cd:6,integ:12,fx:{burn:2}},{nm:"Boiling Spout",g:"g-chalice",size:1,cd:6,integ:12,fx:{burn:2}}]),
 samovar_v2:aspect("samovar","Overboiled",[{nm:"Boiling Spout",g:"g-chalice",size:2,cd:8,integ:20,fx:{dmg:4,burn:5}}]),
 sandling_v1:aspect("sandling","Deep Sand",[],{regen:2,stormAt:14}),
 sandling_v2:aspect("sandling","Sudden Sand",[],{regen:1,stormAt:9}),
 monkey_v1:aspect("monkey","Two Thieves",[{nm:"Sticky Paws",g:"g-purse",size:1,cd:3.5,integ:10,fx:{dmg:2},pocket:1},{nm:"Sticky Paws",g:"g-purse",size:1,cd:3.5,integ:10,fx:{dmg:2},pocket:1}]),
 monkey_v2:aspect("monkey","Greedy Paws",[{nm:"Sticky Paws",g:"g-purse",size:1,cd:2.5,integ:18,fx:{dmg:3},pocket:1}]),
 /* District 1 boss */
 /* retuned: regen back to 2 (from the breaching regen 3) per the directive. The
    boss band is tight (+/-4) and regen is a coarse lever, so the doc's paired
    "smaller poison" (poison 2) traces at +4.7 plain, just past the band; a doting
    matron who kisses more often instead (poison 3 held, cd 4 to 3.5) traces at
    +0/+0, in band. Poison decay caps the faster cadence at shipped difficulty. */
 matron_v1:aspect("matron","Doting",[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:3.5,integ:24,fx:{poison:3}}],{regen:2}),
 matron_v2:aspect("matron","Spiteful",[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:4,integ:24,fx:{poison:3}},{nm:"Grave Nail",g:"g-dagger",size:1,cd:4,integ:12,fx:{dmg:3}}],{regen:1}),
 /* District 2, The Souk */
 lamassu_v1:aspect("lamassu","Thick Wall",[{nm:"Bulwark Bull",g:"g-brassbuckler",size:3,cd:0,integ:80,fx:{},bulwark:true},{nm:"Horn Chime",g:"g-mace",size:1,cd:4,integ:12,fx:{dmg:8}}]),
 lamassu_v2:aspect("lamassu","Twin Chimes",[{nm:"Bulwark Bull",g:"g-brassbuckler",size:3,cd:0,integ:45,fx:{},bulwark:true},{nm:"Horn Chime",g:"g-mace",size:1,cd:5,integ:10,fx:{dmg:7}},{nm:"Horn Chime",g:"g-mace",size:1,cd:5,integ:10,fx:{dmg:7}}]),
 /* retuned: charge s 2 to 1 softened the gilded breach to the band edge (about
    minus 8); slowing the hooves (cd 5 to 6) and thinning them (integ 12 to 10)
    so player weapons clear the accelerant sooner traces at +1.3/-4.7, in band
    with margin. The kill-order fight the aspect is built around is intact. */
 kark_v1:aspect("kark","Pawing Charge",[{nm:"Pawing Hooves",g:"g-hourglass",size:1,cd:6,integ:10,fx:{},charge:{t:1,s:1}},{nm:"Gore Horn",g:"g-hammer",size:3,cd:13,integ:30,fx:{dmg:55}}]),
 kark_v2:aspect("kark","Second Answer",[{nm:"Gore Horn",g:"g-hammer",size:3,cd:9,integ:34,fx:{dmg:38}}]),
 collector_v1:aspect("collector","Two Ledgers",[{nm:"Ledger Blade",g:"g-sword",size:2,cd:8,integ:20,fx:{dmg:4}},{nm:"Ledger Blade",g:"g-sword",size:2,cd:8,integ:20,fx:{dmg:4}}]),
 collector_v2:aspect("collector","The Counting Frame",[{nm:"Ledger Blade",g:"g-sword",size:2,cd:5,integ:24,fx:{dmg:6}},{nm:"Counting Frame",g:"g-ledger",size:1,cd:6,integ:14,fx:{shield:8}}]),
 icebox_v1:aspect("icebox","Double Glazed",[{nm:"Frost Vent",g:"g-tower",size:2,cd:5,integ:30,fx:{freeze:2}},{nm:"Frost Vent",g:"g-tower",size:2,cd:5,integ:30,fx:{freeze:2}}]),
 icebox_v2:aspect("icebox","Cold Cellar",[{nm:"Cold Shank",g:"g-dagger",size:1,cd:4,integ:14,fx:{dmg:6}},{nm:"Frost Vent",g:"g-tower",size:2,cd:7,integ:45,fx:{freeze:4}}]),
 peri_v1:aspect("peri","Mirror Shards",[{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:5,fx:{dmg:4},crit:0.35},{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:5,fx:{dmg:4},crit:0.35},{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:5,fx:{dmg:4},crit:0.35},{nm:"Shard Wings",g:"g-fangs",size:1,cd:3,integ:5,fx:{dmg:4},crit:0.35}]),
 peri_v2:aspect("peri","One Perfect Pane",[{nm:"Shard Wings",g:"g-crossbow",size:1,cd:2.5,integ:12,fx:{dmg:7},crit:0.5},{nm:"Shard Wings",g:"g-crossbow",size:1,cd:2.5,integ:12,fx:{dmg:7},crit:0.5}]),
 qareen_v1:aspect("qareen","Fevered Reflection",[],{regen:1}),
 qareen_v2:aspect("qareen","Restless Glass",[],{stormAt:20}),
 /* District 3, Palace Quarter */
 nasnas_v1:aspect("nasnas","The Other Half",[{nm:"Half Buckler",g:"g-buckler",size:1,cd:4,integ:14,fx:{shield:14}},{nm:"Half Dagger",g:"g-dagger",size:1,cd:3,integ:14,fx:{dmg:14}},{nm:"Half Torch",g:"g-torch",size:1,cd:3,integ:14,fx:{burn:4}},{nm:"Half Vial",g:"g-vial",size:1,cd:3,integ:14,fx:{poison:4}},{nm:"Half Bandage",g:"g-bandage",size:1,cd:4,integ:14,fx:{heal:16}}]),
 nasnas_v2:aspect("nasnas","Reordered",[{nm:"Half Bandage",g:"g-bandage",size:1,cd:4,integ:14,fx:{heal:24}},{nm:"Half Vial",g:"g-vial",size:1,cd:3,integ:14,fx:{poison:4}},{nm:"Half Torch",g:"g-torch",size:1,cd:3,integ:14,fx:{burn:6}},{nm:"Half Dagger",g:"g-dagger",size:1,cd:3,integ:14,fx:{dmg:12}},{nm:"Half Buckler",g:"g-buckler",size:1,cd:4,integ:14,fx:{shield:20}}]),
 roc_v1:aspect("roc","Thin Shell",[{nm:"The Egg",g:"g-rocegg",size:3,cd:12,integ:60,fx:{},selfdestruct:true,rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:30,fx:{dmg:18}}}}]),
 roc_v2:aspect("roc","Watched Nest",[{nm:"Broodwatcher",g:"g-fangs",size:1,cd:3,integ:12,fx:{dmg:4}},{nm:"The Egg",g:"g-rocegg",size:3,cd:15,integ:70,fx:{},selfdestruct:true,rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:30,fx:{dmg:22}}}}]),
 simurgh_v1:aspect("simurgh","Molting",[{nm:"Tail Feather",g:"g-feather",size:1,cd:2,integ:10,fx:{dmg:6}},{nm:"Tail Feather",g:"g-feather",size:1,cd:2,integ:10,fx:{dmg:6}},{nm:"Preen",g:"g-hatchling",size:2,cd:8,integ:24,fx:{hasteAll:2}}]),
 simurgh_v2:aspect("simurgh","Preening Twice",[{nm:"Tail Feather",g:"g-feather",size:1,cd:2.5,integ:14,fx:{dmg:9}},{nm:"Preen",g:"g-hatchling",size:2,cd:5,integ:20,fx:{hasteAll:1.5}}]),
 shahmaran_v1:aspect("shahmaran","The Court Convenes",[{nm:"Serpent Crown",g:"g-serpentcrown",size:2,cd:6,integ:24,fx:{poison:3}},{nm:"Coiled Court",g:"g-sanctum",size:2,cd:6,integ:18,fx:{heal:7}},{nm:"Court Adder",g:"g-serpent",size:1,cd:4,integ:12,fx:{dmg:5}}]),
 shahmaran_v2:aspect("shahmaran","Crowned Twice",[{nm:"Serpent Crown",g:"g-serpentcrown",size:2,cd:7,integ:20,fx:{poison:5}},{nm:"Serpent Crown",g:"g-serpentcrown",size:2,cd:7,integ:20,fx:{poison:5}}]),
 marid_v1:aspect("marid","High Tide",[{nm:"Tide Wall",g:"g-tidewall",size:2,cd:6,integ:30,fx:{shield:15}},{nm:"Tide Wall",g:"g-tidewall",size:2,cd:6,integ:30,fx:{shield:15}},{nm:"Drip",g:"g-vial",size:1,cd:3,integ:10,fx:{dmg:4}}]),
 marid_v2:aspect("marid","Undertow",[{nm:"Tide Wall",g:"g-tidewall",size:3,cd:7,integ:36,fx:{shield:25}},{nm:"Spring",g:"g-chalice",size:2,cd:5,integ:22,fx:{heal:10}},{nm:"Undertow",g:"g-vial",size:1,cd:4,integ:12,fx:{poison:2}}]),
 golem_v1:aspect("golem","Stoked Hopper",[{nm:"Coin Hopper",g:"g-coinhopper",size:1,cd:6,integ:20,fx:{reload:2}},{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:3,integ:38,fx:{dmg:12},ammo:3}]),
 golem_v2:aspect("golem","Double Barrels",[{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:4,integ:30,fx:{dmg:10},ammo:4},{nm:"Coin Hopper",g:"g-coinhopper",size:1,cd:8,integ:14,fx:{reload:2}},{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:4,integ:30,fx:{dmg:10},ammo:4}]),
 /* District 3 boss */
 ifrit_v1:aspect("ifrit","Backdraft",[{nm:"Bellows",g:"g-hourglass",size:2,cd:5,integ:22,fx:{},charge:{t:1,s:2}},{nm:"Kiln Heart",g:"g-magma",size:3,cd:6,integ:34,fx:{burn:8}}]),
 ifrit_v2:aspect("ifrit","Twin Kilns",[{nm:"Kiln Heart",g:"g-magma",size:2,cd:9,integ:28,fx:{burn:6}},{nm:"Kiln Heart",g:"g-magma",size:2,cd:9,integ:28,fx:{burn:6}}]),
 /* District 4, The Dragon Gate */
 azhdaha_v1:aspect("azhdaha","Elder Heads",[{nm:"First Head",g:"g-azhfang",size:3,cd:14,integ:45,fx:{dmg:26},rattle:{hasteMates:0.5}},{nm:"Second Head",g:"g-azhfang",size:3,cd:14,integ:45,fx:{dmg:26},rattle:{hasteMates:0.5}},{nm:"Third Head",g:"g-azhfang",size:3,cd:14,integ:45,fx:{dmg:26},rattle:{hasteMates:0.5}}]),
 azhdaha_v2:aspect("azhdaha","Young Hydra",[{nm:"First Head",g:"g-fangs",size:2,cd:10,integ:55,fx:{dmg:16},rattle:{hasteMates:0.5}},{nm:"Second Head",g:"g-fangs",size:2,cd:10,integ:55,fx:{dmg:16},rattle:{hasteMates:0.5}},{nm:"Third Head",g:"g-fangs",size:2,cd:10,integ:55,fx:{dmg:16},rattle:{hasteMates:0.5}}]),
 auctioneer_v1:aspect("auctioneer","Eager Gavel",[{nm:"The Gavel",g:"g-gavel",size:2,cd:4,integ:40,fx:{dmg:11}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:7,integ:14,fx:{disable:true},pay:4,flying:true}]),
 auctioneer_v2:aspect("auctioneer","Double Lots",[{nm:"The Gavel",g:"g-gavel",size:2,cd:5,integ:40,fx:{dmg:11}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:5.5,integ:14,fx:{disable:true},pay:2,flying:true}]),
 /* District 4 boss */
 vizier_v1:aspect("vizier","The Receipts",[{nm:"Ash Bulwark",g:"g-brassbuckler",size:3,cd:0,integ:110,fx:{},bulwark:true},{nm:"Cinder Core",g:"g-magma",size:3,cd:4.5,integ:40,fx:{dmg:6,burn:10}},{nm:"Frost Scepter",g:"g-tidewall",size:2,cd:7,integ:36,fx:{freeze:3}},{nm:"Ash Chalice",g:"g-chalice",size:2,cd:5,integ:36,fx:{heal:16}}]),
 vizier_v2:aspect("vizier","Cold Accounting",[{nm:"Ash Bulwark",g:"g-brassbuckler",size:3,cd:0,integ:90,fx:{},bulwark:true},{nm:"Cinder Core",g:"g-magma",size:3,cd:4.5,integ:40,fx:{dmg:6,burn:9}},{nm:"Frost Scepter",g:"g-tidewall",size:2,cd:8,integ:36,fx:{freeze:4}},{nm:"Ash Chalice",g:"g-chalice",size:2,cd:5,integ:36,fx:{heal:20}}])
});
/* the Aspect registry: base id to its two variant keys. aspectMonId (aspects.js)
   reads this, never a field on the base entry, so MONSTERS base entries stay
   byte-identical to the original and the parity ledger is untouched. */
export const VARIANTS={
 imp:["imp_v1","imp_v2"],rats:["rats_v1","rats_v2"],ghul:["ghul_v1","ghul_v2"],samovar:["samovar_v1","samovar_v2"],
 sandling:["sandling_v1","sandling_v2"],monkey:["monkey_v1","monkey_v2"],matron:["matron_v1","matron_v2"],
 lamassu:["lamassu_v1","lamassu_v2"],kark:["kark_v1","kark_v2"],collector:["collector_v1","collector_v2"],
 icebox:["icebox_v1","icebox_v2"],peri:["peri_v1","peri_v2"],qareen:["qareen_v1","qareen_v2"],
 nasnas:["nasnas_v1","nasnas_v2"],roc:["roc_v1","roc_v2"],simurgh:["simurgh_v1","simurgh_v2"],
 shahmaran:["shahmaran_v1","shahmaran_v2"],marid:["marid_v1","marid_v2"],golem:["golem_v1","golem_v2"],
 ifrit:["ifrit_v1","ifrit_v2"],azhdaha:["azhdaha_v1","azhdaha_v2"],auctioneer:["auctioneer_v1","auctioneer_v2"],
 vizier:["vizier_v1","vizier_v2"]
};
/* District Affixes: one one-word rule per non-Gate district, drawn from that
   district boss's theme, injected purely as engine cfg.hooks. Keyed by district
   sourceId 1 to 3 (a Long reprise shares its source district's set, salted by
   its own id so it draws independently). Each affix is {id, w, d, hooks}: w the
   one player-facing word, d the scout sentence, hooks an array of R8 hook specs.
   Every op appears in HOOK_ACTIONS (engine.js) and every on in COMBAT_HOOK_POINTS;
   affix hooks are stamped side b (the monster), kind rule at wire time. The
   amounts are literal on purpose, so gilding and Lantern power (which multiply
   item fx at compile, never hook amounts) price the district ceiling while an
   affix prices only its floor: the scout word reads exactly what the fight does.
   Freeze is deliberately absent from every affix because it is not a hook op. */
export const AFFIXES={
 /* District 1, from Ghul Matron: she mends as fast as you can cut, and her kiss
    poisons. Trains burst, cleanse, and shield play against the district boss. */
 1:[
  {id:"mending",w:"Mending",d:"Wounds close in these alleys: this foe heals 2 whenever its wares strike you, at most once a second.",
   hooks:[{on:"afterHit",oncePerMs:1000,when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}],actions:[{op:"heal",side:"owner",amount:2}]}]},
  {id:"venomed",w:"Venomed",d:"The Matron's kiss rides every blade: this foe's merchant strikes add 1 poison, at most once every 2 seconds.",
   hooks:[{on:"afterHit",oncePerMs:2000,when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}],actions:[{op:"poison",targetSide:"enemy",amount:1}]}]},
  {id:"clinging",w:"Clinging",d:"Grave-dust clings to your salves: your healing is a fifth weaker behind these doors.",
   hooks:[{on:"beforeHeal",when:[{test:"eventSideIsEnemy"}],actions:[{op:"modifyHeal",mul:0.8}]}]}
 ],
 /* District 2, from The Debt Collector: gold, ledgers, the long count. Trains the
    poison pivot, racing, and integrity care. */
 2:[
  {id:"hoarding",w:"Hoarding",d:"Coin stands stacked as armor: this foe begins the fight with 12 shield.",
   hooks:[{on:"fightStart",actions:[{op:"shield",side:"owner",amount:12}]}]},
  {id:"taxing",w:"Taxing",d:"Interest accrues: every fourth activation by this foe's wares costs your merchant 2 health.",
   hooks:[{on:"afterActivate",every:4,when:[{test:"actorSideIsOwner"}],actions:[{op:"merchantHit",side:"enemy",amount:2}]}]},
  {id:"foreclosing",w:"Foreclosing",d:"Broken stock is repossessed: when one of your wares is destroyed, this foe heals 6.",
   hooks:[{on:"destroyed",when:[{test:"eventSideIsEnemy"}],actions:[{op:"heal",side:"owner",amount:6}]}]}
 ],
 /* District 3, from Ifrit of the Kiln: the kiln, the bellows. Trains cleanse
    cadence against burn and kill-order against acceleration. */
 3:[
  {id:"smoldering",w:"Smoldering",d:"Kiln-heat rides every blow: this foe's merchant strikes add 2 burn, at most once every 2 seconds.",
   hooks:[{on:"afterHit",oncePerMs:2000,when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}],actions:[{op:"burn",targetSide:"enemy",amount:2}]}]},
  {id:"bellowed",w:"Bellowed",d:"The bellows breathe down every alley: this foe's strike quickens its leftmost working ware a quarter second, at most once every 2 seconds.",
   hooks:[{on:"afterHit",oncePerMs:2000,when:[{test:"actorSideIsOwner"}],actions:[{op:"haste",target:{side:"owner",active:true},amount:0.25}]}]},
  {id:"scorched",w:"Scorched",d:"You arrive singed: 3 burn clings to you as each fight begins.",
   hooks:[{on:"fightStart",actions:[{op:"burn",targetSide:"enemy",amount:3}]}]}
 ]
};
export const MONBAND={1:["imp","rats","ghul","samovar","sandling","monkey"],2:["lamassu","kark","collector","matron","icebox","peri"],3:["ifrit","qareen","shahmaran","marid","roc","simurgh","golem","nasnas"],4:["azhdaha","auctioneer","vizier"]};
export const MONCHIP={1:2,2:4,3:6,4:8};
/* The Long Bazaar route layer. District tables define each route stage: which
   monsters fill their normal and elite doors, the fixed boss, the map-depth to
   engine Threat mapping (fed to fightHP and stormAt), and the Slip Past cost in
   Resolve. This deliberately differs from the legacy MONBAND/band grouping; the
   route uses these tables, combat still reads MONSTERS for stats. Threat: early
   is columns 1 to 2, late is columns 3 to 5, boss is its own value. */
export const DISTRICTS=[
 {id:1,name:"Back Alleys",boss:"matron",threatEarly:1,threatLate:2,threatBoss:3,slip:3,
  normals:["imp","rats","samovar","sandling","monkey"],elites:["ghul"]},
 {id:2,name:"The Souk",boss:"collector",threatEarly:4,threatLate:5,threatBoss:6,slip:5,
  normals:["lamassu","icebox","peri","qareen"],elites:["kark"]},
 {id:3,name:"Palace Quarter",boss:"ifrit",threatEarly:7,threatLate:8,threatBoss:9,slip:7,
  normals:["nasnas","roc","simurgh"],elites:["shahmaran","marid","golem"]},
 {id:4,name:"The Dragon Gate",boss:"vizier",threatEarly:10,threatLate:11,threatBoss:12,slip:0,
  normals:[],elites:["azhdaha","auctioneer"]}
];
/* The extended route reuses the approved encounter sets as explicit reprises.
   sourceId tells presentation which district art and monster pool the reprise
   belongs to; id remains the unique route position. Late combats are forced
   gilded, then power provides the smallest district-specific calibration that
   keeps accumulated Long economy from turning the second act into a victory lap. */
export const LONG_DISTRICTS=[
 {id:1,sourceId:1,name:"Back Alleys",boss:"matron",threatEarly:1,threatLate:2,threatBoss:3,slip:3,lossChip:2,
  normals:DISTRICTS[0].normals,elites:DISTRICTS[0].elites},
 {id:2,sourceId:2,name:"The Souk",boss:"collector",threatEarly:4,threatLate:5,threatBoss:6,slip:5,lossChip:4,
  normals:DISTRICTS[1].normals,elites:DISTRICTS[1].elites},
 {id:3,sourceId:3,name:"Palace Quarter",boss:"ifrit",threatEarly:7,threatLate:8,threatBoss:9,slip:7,lossChip:6,
  normals:DISTRICTS[2].normals,elites:DISTRICTS[2].elites},
 {id:4,sourceId:1,name:"Back Alleys After Midnight",boss:"matron",threatEarly:10,threatLate:11,threatBoss:12,slip:8,lossChip:6,power:2.9,
  normals:DISTRICTS[0].normals,elites:DISTRICTS[0].elites,forceGilded:true,reprise:true},
 {id:5,sourceId:2,name:"The Souk After Midnight",boss:"collector",threatEarly:13,threatLate:14,threatBoss:15,slip:9,lossChip:7,power:1.6,
  normals:DISTRICTS[1].normals,elites:DISTRICTS[1].elites,forceGilded:true,reprise:true},
 {id:6,sourceId:3,name:"Palace Quarter After Midnight",boss:"ifrit",threatEarly:16,threatLate:17,threatBoss:18,slip:10,lossChip:8,power:2.05,
  normals:DISTRICTS[2].normals,elites:DISTRICTS[2].elites,forceGilded:true,reprise:true},
 {id:7,sourceId:4,name:"The Dragon Gate",boss:"vizier",threatEarly:19,threatLate:20,threatBoss:21,slip:0,lossChip:10,power:1.6,
  normals:[],elites:DISTRICTS[3].elites,forceGilded:true}
];
