function loadEntryWindowData( entryWindow ) {
  const name = entryWindow.system.toUpperCase();
  const id   = gSolarSystems.find( s => s.N.toUpperCase() === name ).I;
  return loadKillmails({
    type:      { name: 'solarSystemID', id },
    start:     createZkbDateStart( entryWindow.startTime ),
    end:       createZkbDateEnd( entryWindow.endTime ),
    realStart: entryWindow.startTime,
    realEnd:   entryWindow.endTime
  });
}

// /////////////////////////////////////// ZKillboard parsing ///////////////////////////////////////////

async function fetchPages( params, page = 1 ) {
  const label = params.type.name === 'solarSystemID'
    ? solarSystemIDtoName( params.type.id )
    : `${params.type.name}:${params.type.id}`;
  $( '#status' ).text( `Reading data for ${label} from ${params.start} to ${params.end}, page # ${params.totalPages + page}-${params.totalPages + 10}` );
  return [].concat( ...( await Promise.all( new Array( 1 ).fill( 0 ).map(( x, i ) => json( url( Object.assign( params, { page: i + 1 })))))));
}

const json = ( ...args ) => fetch( ...args ).then( res => res.json() );

const chunkedJson = ( endpoint, ids, size ) =>
  Promise.all( ids.chunk( size ).map( chunk => json( endpoint, { method: 'POST', body: '[' + chunk.join() + ']' })))
    .then( chunks => [].concat( ...chunks ));

async function loadKillmails( params, end = params.end, totalPages = 0 ) {
  const data = await fetchPages( Object.assign( params, { end, totalPages }));
  if ( data.length !== 0 && data.length === 200 * 10 ) {
    const last = data[ data.length - 1 ];
    const d    = new Date( last.killmail_time );
    d.setHours( d.getHours() + 1 );
    const more          = await loadKillmails( params, d.toISOString().replace( /:|-| |T/g, '' ).substring( 0, 10 ) + '00', totalPages + 10 );
    const lastKillIndex = more.findIndex( ({ killmail_id }) => killmail_id === last.killmail_id );
    return data.concat( more.slice( lastKillIndex + 1 ));
  }
  return data;
}

Object.defineProperty( Array.prototype, 'chunk', {
  value( chunkSize ) {
    const R = [];
    for ( let i = 0; i < this.length; i += chunkSize ) R.push( this.slice( i, i + chunkSize ));
    return R;
  }
});

const url = ({ type: { name, id }, start, end, page }) =>
  `https://zkillboard.com/api/kills/${name}/${id}/startTime/${start}/endTime/${end}/page/${page}/`;

const toMap = ( arr, key, value ) => new Map( arr.map( el => [ el[ key ], el[ value ] ]));

// /////////////////////////////////////// data parsing ///////////////////////////////////////////

function cleaniskData() {
  gData.forEach( killmail => {
    if ( killmail.zkb !== undefined ) {
      killmail.zkb.totalValue = !isNaN( parseInt( killmail.zkb.totalValue ))
        ? parseInt( killmail.zkb.totalValue )
        : 0;
    } else {
      killmail.zkb = { totalValue: 0 };
    }
  });
}

function build_data( idToName ) {
  cleaniskData();
  handleUnknownShips();

  // Ship fielded/lost calcs
  gPlayers.forEach( player => {
    let totalLost = 0, totalFielded = 0;
    player.ships.forEach( ship => {
      let fielded = 1, lost = 0, prevWasVictim = false, lastVictimTime = 0;
      ship.kills.sort(( lhs, rhs ) => {
        if ( lhs.time === rhs.time ) return isCapsule( lhs.ship_type_id ) - isCapsule( rhs.ship_type_id );
        return lhs.time > rhs.time ? 1 : -1;
      });
      ship.kills.forEach( kill => {
        if ( prevWasVictim && lastVictimTime !== kill.time && kill.ship_type_id !== 0 ) ++fielded;
        prevWasVictim = kill.victim;
        if ( kill.victim ) { ++lost; lastVictimTime = kill.time; }
      });
      ship.lost    = lost;
      ship.fielded = fielded;
      totalLost    += lost;
      totalFielded += fielded;
    });
    player.fielded = totalFielded;
    player.lost    = totalLost;
  });

  parseGroupData( gData );
  build_teams( gGroups, idToName );

  // Isk calcs
  gData.forEach( killmail => {
    const kmGroupID = killmail.victim.alliance_id || killmail.victim.corporation_id;
    if ( killmail.zkb !== undefined ) {
      gGroups.forEach( group => {
        if ( group.ID === kmGroupID && !isNaN( parseInt( killmail.zkb.totalValue, 10 ))) {
          group.iskLost += parseInt( killmail.zkb.totalValue, 10 );
        }
      });
    }
  });
}

function createGroupedArray( arr, chunkSize ) {
  const groups = [];
  for ( let i = 0; i < arr.length; i += chunkSize ) groups.push( arr.slice( i, i + chunkSize ));
  return groups;
}

function parseKillRecord( kill, idToName ) {
  assert( kill !== undefined );
  assert( kill.victim !== undefined );

  kill.value = function() {
    if ( !gOptEstimateFighterValues ) return kill.zkb.totalValue;
    const ship = gShipTypes.find( X => X.I == kill.victim.ship_type_id );
    if ( ship === undefined ) return kill.zkb.totalValue;
    const group = ship.G;
    const value = parseInt( this.zkb.totalValue, 10 );
    if ( group === 'Support Fighter'           ) return value * 3;
    if ( group === 'Heavy Fighter'             ) return value * 6;
    if ( group === 'Light Fighter'             ) return value * 9;
    if ( group === 'Space Superiority Fighter' ) return value * 12;
    return value;
  };

  if ( kill.zkb && !isNaN( parseInt( kill.value(), 10 ))) {
    kill.zkb.totalValue  = kill.value();
    gSummaryIskLost     += parseInt( kill.value(), 10 );
  }

  [ kill.victim, ...kill.attackers ].forEach( attacker => updateShip( attacker, kill, kill.victim, idToName ));
}

function handleUnknownShips() {
  gPlayers.forEach( player => {
    player.ships = [ ...player.ships ].sort(( a, b ) => a.ship_type_id - b.ship_type_id );
    const unknownShip = player.ships.find( ship => ship.ship_type_id === 0 );
    if ( unknownShip !== undefined && player.ships.length > 1 ) {
      player.ships[ 0 ].kills.forEach( kill => player.ships[ 1 ].kills.push( kill ));
      player.ships.shift();
    }
    player.ships.forEach(( ship, shipIDX ) => { ship.index = shipIDX; });
  });
}

function parseGroupData( killdata ) {
  gPlayers.forEach( player => updateGroup( checkGroupExists( player ), player ));
  gGroups = [ ...gGroups ].sort(( a, b ) => ( 1 / b.players ) - ( 1 / a.players ));
}

function updateShip( player, kill, victim, idToName ) {
  const playerIndex = checkPlayerExists( player, idToName );
  const shipIndex   = checkShipExists( player, playerIndex );
  const newKill = {
    killmail_id:  kill.killmail_id,
    time:         kill.killmail_time,
    player:       gPlayers[ checkPlayerExists( victim, idToName )],
    victim:       player.character_id == victim.character_id,
    iskLost:      0,
    ship_type_id: player.ship_type_id
  };
  assert( victim !== undefined );
  if ( newKill.victim ) {
    assert( gTotalDamage !== undefined );
    assert( player.damage_taken !== undefined );
    gTotalDamage      += Number( player.damage_taken );
    newKill.damage     = Number( player.damage_taken );
    newKill.final_blow = 0;
    newKill.weaponTypeID = 0;
    if ( kill.zkb !== undefined && kill.zkb.totalValue !== undefined ) {
      newKill.iskLost = parseInt( kill.zkb.totalValue, 10 );
    }
  } else {
    newKill.damage      = Number( player.damage_done );
    newKill.final_blow  = player.final_blow;
    newKill.weaponTypeID = player.weaponID;
  }
  assert( gPlayers[ playerIndex ].ships[ shipIndex ] !== undefined );
  gPlayers[ playerIndex ].ships[ shipIndex ].kills.push( newKill );
}

// Player Functions

function checkPlayerExists( player, idToName ) {
  const foundPlayer = gPlayers.find(( testPlayer ) => {
    if ( player.character_id == testPlayer.character_id ) {
      const equal = player.alliance_id == testPlayer.alliance_id;
      if ( player.corporation_id ) {
        if ( testPlayer.corporation_id ) {
          return player.corporation_id == testPlayer.corporation_id;
        }
        if ( equal ) {
          testPlayer.corporation_id   = player.corporation_id;
          testPlayer.corporation_name = idToName.get( player.corporation_id );
        }
      }
      return equal;
    }
    return false;
  });
  return foundPlayer !== undefined ? foundPlayer.index : addplayer( player, idToName );
}

function addplayer({ character_id, corporation_id, alliance_id, faction_id }, idToName ) {
  return gPlayers.push({
    id:               character_id,
    character_id,
    name:             idToName.get( character_id ),
    corporation_id,
    corporation_name: idToName.get( corporation_id ),
    alliance_id,
    alliance_name:    idToName.get( alliance_id ),
    faction_id,
    faction_name:     faction_id,
    ships:            [],
    damage_dealt:     0,
    damage_taken:     0,
    index:            gPlayers.length
  }) - 1;
}

function checkShipExists( player, playerIndex ) {
  const foundShip = gPlayers[ playerIndex ].ships.find( s => player.ship_type_id == s.ship_type_id );
  return foundShip !== undefined ? foundShip.index : addship( player, playerIndex );
}

function addship( player, playerIndex ) {
  if ( isCapsule( player.ship_type_id )) ++gSummaryPods;
  else                                   ++gSummaryShips;
  const newship = {
    kills:        [],
    iskLost:      0,
    damage_taken: 0,
    damage_dealt: 0,
    ship_type_id: player.ship_type_id,
    index:        gPlayers[ playerIndex ].ships.length
  };
  gPlayers[ playerIndex ].ships.push( newship );
  return newship.index;
}

// Group Functions

function checkGroupExists( player ) {
  const groupID   = player.alliance_id || player.corporation_id;
  const foundGroup = gGroups.find( g => groupID == g.ID );
  if ( foundGroup !== undefined ) {
    player.group = foundGroup;
    return foundGroup.index;
  }
  return addGroup( player );
}

function addGroup( player ) {
  const newGroup = {
    ID:                player.alliance_id  ? player.alliance_id     : player.corporation_id,
    name:              player.alliance_id  ? player.alliance_name   : player.corporation_name,
    factionID:         player.factionID,
    faction_name:      player.faction_name,
    damage_dealt:      0,
    damage_taken:      0,
    killed:            0,
    players:           0,
    iskLost:           0,
    ships:             [],
    index:             gGroups.length,
    coalitionShortName:''
  };
  player.group = newGroup;
  gGroups.push( newGroup );
  return newGroup.index;
}

function updateGroup( groupIndex, player ) {
  const group = gGroups[ groupIndex ];
  ++group.players;
  player.ships.forEach( playerShip => {
    const groupShip = checkGroupShipExists( group, playerShip );
    playerShip.kills.forEach( kill => {
      if ( kill.victim ) {
        assert( group.damage_taken  !== undefined );
        assert( groupShip.damage_taken !== undefined );
        group.damage_taken     += kill.damage;
        groupShip.damage_taken += kill.damage;
        groupShip.iskLost      += kill.iskLost;
      } else {
        assert( group.damage_dealt    !== undefined );
        assert( groupShip.damage_dealt !== undefined );
        group.damage_dealt     += kill.damage;
        groupShip.damage_dealt += kill.damage;
      }
    });
    groupShip.fielded += playerShip.fielded;
    groupShip.lost    += playerShip.lost;
    group.killed      += playerShip.lost;
  });
}

function checkGroupShipExists( group, ship ) {
  const found = group.ships.find( s => ship.ship_type_id == s.shipID );
  return found !== undefined ? found : addGroupShip( ship, group );
}

function addGroupShip({ ship_type_id }, group ) {
  return group.ships[ group.ships.push({
    shipID:       ship_type_id,
    lost:         0,
    fielded:      0,
    iskLost:      0,
    damage_taken: 0,
    damage_dealt: 0,
    index:        group.ships.length
  }) - 1 ];
}

function build_teams( groups, idToName ) {
  gTeams = [ [], [] ];
  groups.forEach(( group, index ) => {
    const dmgTakenFactor = Math.round( group.damage_taken / gTotalDamage * 1000 ) / 10;
    const dmgDealtFactor = Math.round( group.damage_dealt / gTotalDamage * 1000 ) / 10;
    const playerFactor   = Math.round( group.players / Math.min( gPlayers.length, 1000 ) * 1000 ) / 10;

    if ( dmgTakenFactor < 1 && dmgDealtFactor < 1 && playerFactor < 1 && gOptIgnoreInsig ) {
      group.team = -1;
    } else {
      let team;
      if ( gLoadTeams.length > 0 ) {
        team = gLoadTeams[ index ] === undefined ? 0 : gLoadTeams[ index ];
      } else if ( gCurrentTeams.length > 0 ) {
        team = 1;
        gCurrentTeams.forEach(( currentTeam, currentTeamIdx ) => {
          team = currentTeam.find( X => X === group.ID + '' ) !== undefined ? currentTeamIdx : team;
        });
      } else {
        team = gBlueTeams.find( X => X == group.ID ) !== undefined ? 0 : 1;
      }
      while ( team >= gTeams.length ) gTeams.push( [] );
      gTeams[ team ].push( index );
      group.team = team;
    }
  });
  addTeamTabs( idToName );
}

function assign_group_to_team( targetTeam, groupIndex ) {
  const currentTeam = getTeam( gGroups[ groupIndex ].ID );
  if ( currentTeam === 0 ) {
    gBlueTeams = gBlueTeams.filter( x => x !== gGroups[ groupIndex ].ID + '' );
    writeCookies();
  }
  gGroups[ groupIndex ].team = targetTeam;
  gTeams[ currentTeam ] = gTeams[ currentTeam ].filter( x => x !== groupIndex );
  if ( gTeams.length > targetTeam ) {
    gTeams[ targetTeam ].push( groupIndex );
  } else {
    gTeams.push( [] );
    gTeams[ targetTeam ].push( groupIndex );
  }
  if ( targetTeam === 0 ) {
    gBlueTeams.push( gGroups[ groupIndex ].ID + '' );
    writeCookies();
  }
}

function delete_team( teamIdx ) {
  profile( 'removeTeamTabs', () => removeTeamTabs() );
  gTeams.splice( teamIdx, 1 );
  profile( 'addTeamTabs',    () => addTeamTabs() );
  profile( 'refresh',        () => refresh() );
}

function MakeSpan( val ) {
  return `<span class="ui-state-default ui-state-error ui-corner-all ux-summaryBox">${val}</span>`;
}

function generateSummary( startTime, endTime, lastKillTime, workingFlag, idToName ) {
  const summaryIskLost = roundIsk( gSummaryIskLost );
  let outputText = 'Total lost';

  if ( workingFlag ) {
    outputText += ' so far';
  } else {
    addTab( 10,  'Involved',      'involvedTable',     () => generateInvolved( idToName ) );
    addTab( 20,  'Class Summary', 'classSummaryTable', () => draw_class_summary_table( '#classSummaryTable' ) );
    addTab( 30,  'Ship Summary',  'summaryTable',      () => draw_summary_table( '#summaryTable', gTeams ) );
    addTab( 40,  'Timeline',      'timeLine',          () => generateBattleTimeline( '#timeLine', idToName ) );
    addTab( 50,  'Replay',        'animTab',           () => generateAnimation( '#animTab' ) );
    addTab( 400, 'Chart',         'chartTab',          () => draw_charts() );
    addTab( 500, 'Kill List',     'ktl',               () => draw_kill_table( idToName ) );
  }
  outputText += `: ${MakeSpan( summaryIskLost )} Players: ${MakeSpan( gPlayers.length )} Ships: ${MakeSpan( gSummaryShips )} Pods: ${MakeSpan( gSummaryPods )}`;
  $( '#summaryText' ).empty().append( outputText );
}
