let gCalculatedInvolved = [];
let gAttackersThisFrame = [];
let gDiedSoFar = [];
let gDiedThisFrame = [];


function addIskSorter() {
  $.tablesorter.addParser({
    id: 'isk',
    is:     s => false,
    format: s => {
      const i    = parseFloat( s );
      const unit = s[ s.length - 1 ];
      if ( unit === 'k' ) return i * 1000;
      if ( unit === 'm' ) return i * 1000000;
      if ( unit === 'b' ) return i * 1000000000;
      if ( unit === 't' ) return i * 1000000000000;
      return i;
    },
    type: 'numeric'
  });
}

function generateTable( headerData, rowData, id, colspan ) {
  if ( colspan === undefined ) colspan = [ 0, 0 ];
  const table = [ `<table class="tablesorter ui-widget" id="${id}"><thead><tr>` ];
  headerData.forEach(( header, headerIDX ) => {
    if ( headerIDX >= colspan[ 0 ] && colspan[ 0 ] !== 0 ) {
      if (( headerIDX - colspan[ 0 ] ) % colspan[ 1 ] === 0 ) {
        table.push( `<th colspan="${colspan[ 1 ]}">${header}</th>` );
      }
    } else {
      table.push( `<th>${header}</th>` );
    }
  });
  table.push( '</tr></thead><tbody class="status">' );
  rowData.forEach( row => {
    table.push( '<tr>' );
    row.forEach( data => {
      table.push( String( data ).substring( 0, 3 ) === '<td' ? data : `<td class="killText">${data}</td>` );
    });
    table.push( '</tr>' );
  });
  table.push( '</tbody></table>' );
  return table.join( '' );
}

function buildKillTable( idToName ) {
  const headerData = [
    '',
    'Name',
    '',
    'Alliance',
    'DMG(k)',
    '',
    'Ship',
    'Type',
    'System',
    'Time',
    'ISK(M)'
  ];
  const rowDataAllTeams = gTeams.map( () => [] );

  gData.forEach( killMail => {
    let groupID = killMail.victim.alliance_id;
    if ( groupID === 0 ) groupID = killMail.victim.corporation_id;
    const isk = killMail.zkb !== undefined ? roundIsk( killMail.zkb.totalValue ) : '?';
    const row = [
      eveImageLink( 'Character', killMail.victim.character_id ), zKillLink( 'character', killMail.victim.character_id, idToName.get( killMail.victim.character_id )),
      eveImageLink( 'Alliance',  killMail.victim.alliance_id ),  zKillLink( 'alliance',  killMail.victim.alliance_id,  idToName.get( killMail.victim.alliance_id )),
      Math.round( killMail.victim.damage_taken / 1000 ),
      eveImageLink( 'Render', killMail.victim.ship_type_id ), zKillLink( 'detail', killMail.killmail_id, ship_type_idtoName( killMail.victim.ship_type_id )),
      ship_type_idtoType( killMail.victim.ship_type_id ),
      solarSystemIDtoName( killMail.solar_system_id ),
      killMail.killmail_time.split( 'T' )[ 1 ].slice( 0, -3 ),
      isk
    ];
    const team = getTeam( groupID );
    if ( team > -1 ) rowDataAllTeams[ team ].push( row );
  });
  console.log( headerData );
  rowDataAllTeams.push( headerData );
  return rowDataAllTeams;
}

function draw_team_kill_table( index, idToName ) {
  addIskSorter();
  const rowDataAllTeams = buildKillTable( idToName );
  const headerData      = rowDataAllTeams.pop();
  const team            = gTeams[ index ];
  if ( team.length !== 0 ) {
    const target = `teamSummary${index}`;
    const output = generateTable( headerData, rowDataAllTeams[ index ], `${target}Table` );
    $( `#${target}` ).empty().append( output );
    $( `#${target}Table` ).tablesorter({ sortList: [[ 8, 1 ],[ 9, 1 ]], headers: { 10: { sorter: 'isk' }}});
  }
}

function getIskSummary() {
  const iskLostArray   = gTeams.map( () => 0 );
  const shipsLostArray = gTeams.map( () => 0 );
  gGroups.forEach( group => {
    const targetTeam = getTeam( group.ID );
    if ( targetTeam !== -1 ) {
      iskLostArray[ targetTeam ] += Number( group.iskLost );
      group.ships.forEach( ship => { shipsLostArray[ targetTeam ] += Number( ship.lost ); });
    }
  });
  return [ iskLostArray, shipsLostArray ];
}

function draw_summary_table( target, teams ) {
  const SHIP_ID_INDEX      = 0;
  const SHIP_NAME_INDEX    = 1;
  const SHIP_CLASS_INDEX   = 2;
  const SHIP_ORDER_INDEX   = 3;
  const SHIP_FIELDED_INDEX = 4;
  const SHIP_LOST_INDEX    = 5;
  const SHIP_ISKLOST_INDEX = 6;
  const TEAM_DATA_SIZE     = 3;
  const SHIP_DATA_SIZE     = 4;
  const FORMAT_TEAM_DATA_SIZE  = 2;
  const FORMAT_SHIP_DATA_SIZE  = 2;
  const FORMAT_SHIP_NAME_INDEX = 1;
  const FORMAT_SHIP_IMG_INDEX  = 0;

  let tableData = [];
  gGroups.forEach( group => {
    group.ships.forEach( ship => {
      const exists     = tableData.find( row => row[ 0 ] === ship.shipID );
      const targetTeam = getTeam( group.ID );
      if ( targetTeam !== -1 ) {
        if ( exists !== undefined ) {
          exists[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ] += ship.fielded;
          exists[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ] += ship.lost;
          exists[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ] += ship.iskLost;
        } else {
          const rowData = createEmptyArray( SHIP_DATA_SIZE + ( teams.length * TEAM_DATA_SIZE ));
          rowData[ SHIP_ID_INDEX    ] = ship.shipID;
          rowData[ SHIP_NAME_INDEX  ] = ship_type_idtoName( ship.shipID );
          rowData[ SHIP_CLASS_INDEX ] = getShipClass( ship.shipID );
          rowData[ SHIP_ORDER_INDEX ] = getShipClassOrder( ship.shipID );
          rowData[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ] = ship.fielded;
          rowData[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ] = ship.lost;
          rowData[ ( targetTeam * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ] = ship.iskLost;
          tableData.push( rowData );
        }
      }
    });
  });

  tableData = [ ...tableData ].sort(( a, b ) => a[ SHIP_ORDER_INDEX ] - b[ SHIP_ORDER_INDEX ]);

  const totalData = createEmptyArray( SHIP_DATA_SIZE + ( teams.length * TEAM_DATA_SIZE ));
  tableData.forEach( rowData => {
    for ( let i = 0; i < teams.length; ++i ) {
      if ( rowData[ SHIP_ID_INDEX ] !== 670 && rowData[ SHIP_ID_INDEX ] !== 33328 ) {
        totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ] += rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ];
        totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ] += rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ];
      }
      totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ] += rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ];
    }
  });

  const formattedTotalData = createEmptyArray(( teams.length * FORMAT_TEAM_DATA_SIZE ) + FORMAT_SHIP_DATA_SIZE );
  formattedTotalData[ FORMAT_SHIP_NAME_INDEX ] = 'Totals';
  formattedTotalData[ FORMAT_SHIP_IMG_INDEX  ] = ' ';
  for ( let i = 0; i < teams.length; ++i ) {
    const shipLost    = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ];
    const shipFielded = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ];
    const iskLost     = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ];
    formattedTotalData[ i + FORMAT_SHIP_DATA_SIZE ]                = tableDataHelper( i, shipFielded, `${shipLost} / ${shipFielded}` );
    formattedTotalData[ i + FORMAT_SHIP_DATA_SIZE + teams.length ] = tableDataHelper( i, iskLost, roundIsk( iskLost ));
  }

  const formattedData = [ formattedTotalData ];
  tableData.forEach( rowData => {
    const formattedRowData = createEmptyArray(( teams.length * FORMAT_TEAM_DATA_SIZE ) + FORMAT_SHIP_DATA_SIZE );
    formattedRowData[ FORMAT_SHIP_NAME_INDEX ] = rowData[ SHIP_NAME_INDEX ];
    formattedRowData[ FORMAT_SHIP_IMG_INDEX  ] = eveImageLink( 'Render', rowData[ SHIP_ID_INDEX ]);
    for ( let i = 0; i < teams.length; ++i ) {
      const shipLost    = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX    ];
      const shipFielded = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ];
      const iskLost     = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ];
      formattedRowData[ i + FORMAT_SHIP_DATA_SIZE ]                = tableDataHelper( i, shipFielded, `${shipLost} / ${shipFielded}` );
      formattedRowData[ i + FORMAT_SHIP_DATA_SIZE + teams.length ] = tableDataHelper( i, iskLost, roundIsk( iskLost ));
    }
    formattedData.push( formattedRowData );
  });

  const headerData = [ '', 'ShipType', ...teams.map( () => 'Lost / Fielded' ), ...teams.map( () => 'ISK lost' ) ];
  const outputHtml = generateTable( headerData, formattedData, 'summaryShipType', [ FORMAT_SHIP_DATA_SIZE, teams.length ]);
  $( target ).empty().append( outputHtml );
}

function draw_localStorageTable() {
  const localStorageTable = load_LS_table();
  const loop = [ 'date', 'size', 'formvalues', 'index' ];
  const lstText = loop.map( column => [
    '<div style="float: left;">',
    '<ol class="summaryclass">',
    `<div class="status">${column}</div>`,
    ...localStorageTable.map( LST_item => `<li><div class="view-listitem">${LST_item[ column ]} </div></li>` ),
    '</ol>',
    '</div>'
  ].join( '' )).join( '' ) + '<br style="clear: left;">';

  $( '#LSTable' ).empty().append( lstText );
}

function draw_kill_table( idToName ) {
  addIskSorter();
  const rowDataAllTeams = buildKillTable( idToName );
  const headerData      = rowDataAllTeams.pop();
  const combinedRowData = [].concat( ...rowDataAllTeams );
  const target          = 'ktl';
  const output          = generateTable( headerData, combinedRowData, `${target}Table` );
  $( `#${target}` ).empty().append( output );
  $( `#${target}Table` ).tablesorter({ sortList: [[ 8, 1 ],[ 9, 1 ]], headers: { 10: { sorter: 'isk' }}});
}

function tableDataHelper( tIdx, condition, content ) {
  return condition > 0
    ? `<td align="center" class="${TEAM_COLORS[ tIdx ]}">${content}</td>`
    : '<td></td>';
}

function draw_class_summary_table( target ) {
  let shipClasses;
  profile( 'classSummary-pluck', () => {
    shipClasses = [ ...new Set( gShipTypes.map( s => s.G )) ];
  });

  const sumTable  = [];
  const totalItem = {
    fielded:  createEmptyArray( gTeams.length ),
    lost:     createEmptyArray( gTeams.length ),
    iskLost:  createEmptyArray( gTeams.length ),
    dmgDealt: createEmptyArray( gTeams.length ),
    dmgTaken: createEmptyArray( gTeams.length )
  };

  profile( 'classSummary-calculate', () => {
    gGroups.forEach(( group, groupIDX ) => {
      group.ships.forEach( ship => {
        const shipClass = gShipTypes.find( item => item.I === ship.shipID );
        if ( shipClass === undefined ) return;
        let sumTableItem = sumTable.find( item => item.shipClass === shipClass.G );
        if ( sumTableItem === undefined ) {
          sumTableItem = {
            shipClass: shipClass.G,
            order:     shipClass.O,
            fielded:   createEmptyArray( gTeams.length ),
            lost:      createEmptyArray( gTeams.length ),
            iskLost:   createEmptyArray( gTeams.length ),
            dmgDealt:  createEmptyArray( gTeams.length ),
            dmgTaken:  createEmptyArray( gTeams.length )
          };
          sumTable.push( sumTableItem );
        }
        let targetTeam = -1;
        gTeams.forEach(( team, teamIDX ) => {
          if ( team.includes( groupIDX )) targetTeam = teamIDX;
        });
        if ( targetTeam !== -1 ) {
          assert( ship.fielded >= 0 );
          assert( ship.lost >= 0 );
          assert( ship.damage_dealt >= 0 );
          assert( ship.damage_taken >= 0 );
          assert( ship.iskLost >= 0 );
          sumTableItem.fielded[ targetTeam ]  += ship.fielded;
          sumTableItem.lost[ targetTeam ]     += ship.lost;
          sumTableItem.dmgDealt[ targetTeam ] += ship.damage_dealt;
          sumTableItem.dmgTaken[ targetTeam ] += ship.damage_taken;
          sumTableItem.iskLost[ targetTeam ]  += ship.iskLost;
          if ( ship.shipID !== 670 && ship.shipID !== 33328 ) {
            totalItem.fielded[ targetTeam ] += ship.fielded;
            totalItem.lost[ targetTeam ]    += ship.lost;
          }
          totalItem.iskLost[ targetTeam ]  += ship.iskLost;
          totalItem.dmgDealt[ targetTeam ] += ship.damage_dealt;
          totalItem.dmgTaken[ targetTeam ] += ship.damage_taken;
        }
      });
    });
  });

  const tmpTable = [ ...sumTable ].sort(( a, b ) => parseInt( a.order ) - parseInt( b.order ));

  const html = [ '<table class="view-classSummary ui-widget">' ];
  html.push( '<tr>' );
  html.push( '  <td></td>' );
  html.push( `  <td align="center" colspan="${gTeams.length}">Lost / Fielded</td>` );
  html.push( `  <td align="center" colspan="${gTeams.length}">ISK lost</td>` );
  html.push( '</tr>' );
  html.push( '<tr>' );
  html.push( '  <td></td>' );

  const countCol = gTeams.map(( team, tIdx ) => tableDataHelper( tIdx, 1, `${totalItem.lost[ tIdx ]} / ${totalItem.fielded[ tIdx ]}` ));
  const iskCol   = gTeams.map(( team, tIdx ) => tableDataHelper( tIdx, 1, roundIsk( totalItem.iskLost[ tIdx ] )));
  html.push( countCol.join( '' ) + iskCol.join( '' ));
  html.push( '</tr>' );

  let row = 0;
  tmpTable.forEach( sumTableItem => {
    if ( row++ % 4 === 0 ) {
      html.push( `<tr><td colspan=${gTeams.length * 2 + 1} class="view-divider"></td></tr>` );
    }
    html.push( '<tr>' );
    html.push( `<td>${sumTableItem.shipClass}</td>` );
    const rowCountCol = gTeams.map(( team, tIdx ) => tableDataHelper( tIdx, sumTableItem.fielded[ tIdx ], `${sumTableItem.lost[ tIdx ]} / ${sumTableItem.fielded[ tIdx ]}` ));
    const rowIskCol   = gTeams.map(( team, tIdx ) => tableDataHelper( tIdx, sumTableItem.iskLost[ tIdx ], roundIsk( sumTableItem.iskLost[ tIdx ] )));
    html.push( rowCountCol.join( '' ));
    html.push( rowIskCol.join( '' ));
    html.push( '</tr>' );
  });
  html.push( '</table>' );
  html.push( '<br style="clear: left;">' );

  $( target ).empty().append( html.join( '' ));
}

function initInvolvedEntry( player ) {
  return {
    alliance_name:    player.alliance_name,
    corporation_name: player.corporation_name,
    corporation_id:   player.corporation_id,
    alliance_id:      player.alliance_id,
    playerName:       player.name,
    playerID:         player.id,
    victim:           false,
    time:             0,
    podKillID:        0,
    shipID:           -1,
    kills:            0
  };
}

function buildInvolved() {
  const involved    = gTeams.map( () => [] );
  const teamLosses  = gTeams.map( () => 0 );

  profile( 'involved-genTempData', () => {
    gPlayers.forEach(( player ) => {
      assert( player.group.team < involved.length );
      assert( player.name !== DEBUG_PLAYER );
      const tempData = [];
      if ( player.group.team >= 0 ) {
        player.ships.forEach( ship => {
          let invEntry = initInvolvedEntry( player );
          teamLosses[ player.group.team ] += ship.lost;
          const temp = gShipTypes.find( X => X.I === ship.ship_type_id );
          if ( temp !== undefined )
            console.log( `(${teamLosses[ player.group.team ]}) adding ${ship.lost} loss(es) to team #${player.group.team} for ${player.name}(${player.corporation_name}) [${player.alliance_name}]: ${temp.N}` );
          ship.kills.forEach( kill => {
            invEntry.shipID = ship.ship_type_id;
            invEntry.time   = kill.time;
            if ( kill.victim ) {
              invEntry.victim      = true;
              invEntry.killmail_id = kill.killmail_id;
              invEntry.shipData    = gShipTypes.find( X => X.I === invEntry.shipID );
              if ( invEntry.shipData === undefined ) {
                invEntry.shipData = gShipTypes.find( X => X.I === 0 );
              }
              tempData.push( invEntry );
              invEntry = initInvolvedEntry( player );
            } else {
              if ( player.group.team !== kill.player.group.team ) ++invEntry.kills;
            }
          });
          if ( ship.fielded > ship.lost && !isCapsule( invEntry.shipID )) {
            if ( invEntry.shipID >= 0 ) {
              invEntry.shipData = gShipTypes.find( X => X.I === invEntry.shipID );
              if ( invEntry.shipData === undefined ) {
                invEntry.shipData = gShipTypes.find( X => X.I === 0 );
              }
              tempData.push( invEntry );
            }
          }
        });
      }
      tempData.sort(( lhs, rhs ) => {
        if ( lhs.time === rhs.time ) return isCapsule( lhs.shipID ) - isCapsule( rhs.shipID );
        return lhs.time > rhs.time ? 1 : -1;
      });
      let prevEntry = undefined;
      tempData.forEach( invEntry => {
        if ( invEntry.victim && isCapsule( invEntry.shipID ) && prevEntry !== undefined ) {
          prevEntry.podKillID = invEntry.killmail_id;
        } else {
          if ( prevEntry !== undefined ) involved[ player.group.team ].push( prevEntry );
          prevEntry = invEntry;
        }
      });
      if ( prevEntry !== undefined ) involved[ player.group.team ].push( prevEntry );
    });
  });

  profile( 'involved-sortByShipClass and Player', () => {
    for ( let i = 0; i < gTeams.length; ++i ) {
      involved[ i ].sort(( lhs, rhs ) => {
        if ( lhs.shipData.O === rhs.shipData.O ) {
          return String( lhs.playerName ).toUpperCase() > String( rhs.playerName ).toUpperCase() ? 1 : -1;
        }
        return lhs.shipData.O > rhs.shipData.O ? 1 : -1;
      });
    }
  });

  const totalLosses = teamLosses.reduce(( s, v ) => s + v, 0 );
  return [ totalLosses, involved, teamLosses ];
}

function setAnimationGroup() {
  gAnimationGroup = $( '#ux-animationGroupBy' ).val();
  refresh();
}

function setAnimationWidth() {
  gAnimationWidth = $( '#ux-animationWidth' ).val();
  refresh();
}

function setAnimationFilter() {
  gShowKillsOnly = $( '#ux-animationFilter' ).val() === 'Kills';
  refresh();
}

function setAnimationSpeed() {
  gAnimationSpeed = Number( $( '#ux-animationSpeed' ).val());
  refresh();
}

function setAnimationLabel() {
  gAnimationLabel = $( '#ux-animationLabel' ).val() === 'On';
  refresh();
}

function setAnimationSort() {
  gAnimationSort = $( '#ux-animationSort' ).val() === 'Size';
  refresh();
}

function setAnimationScale() {
  gAnimationScale = $( '#ux-animationScale' ).val() === '100%';
  refresh();
}

function setRIDtext( teamIDX, invIndex ) {
  if ( gLastHighlightShip.length > 0 ) {
    if ( gLastHighlightShip[ 0 ] === teamIDX && gLastHighlightShip[ 1 ] === invIndex ) {
      closeRIDbox();
      return;
    }
  }

  const p1           = $( '#tabs' ).offset();
  const p2           = $( `#p${invIndex}-${teamIDX}` ).offset();
  const currentWidth = $( document ).width();
  const leftPos      = ( currentWidth - 350 ) > ( p2.left - p1.left ) ? ( p2.left - p1.left ) : ( currentWidth - 350 );
  $( '#replayInfoDiv' ).show();
  $( '#replayInfoDiv' ).animate({ left: `${leftPos}px`, top: `${( p2.top - p1.top ) + ( gAnimationScale ? 36 : 20 )}px` });

  const target = gCalculatedInvolved[ teamIDX ][ invIndex ];
  $( '#RIDname' ).empty().append( `<img src="https://image.eveonline.com/Character/${target.playerID}_32.jpg" style="width: 16px;">${target.playerName}` );
  $( '#RIDship' ).empty().append( target.shipData.N );
  $( '#RIDcorp' ).empty().append( `<img src="https://image.eveonline.com/Corporation/${target.corporation_id}_32.png" style="width: 16px;">${target.corporation_name}` );
  $( '#RIDalliance' ).empty().append( `<img src="https://image.eveonline.com/Alliance/${target.alliance_id}_32.png" style="width: 16px;">${target.alliance_name}` );
  $( '#RIDclass' ).empty().append( target.shipData.G );
  $( '#RIDkills' ).empty().append( target.kills );
  if ( target.victim ) {
    $( '#killedRow' ).show();
    $( '#RIDkilled' ).empty().append( target.time );
    $( '#RIDisk' ).empty().append( roundIsk( target.iskLost ));
  } else {
    $( '#killedRow' ).hide();
  }
  console.log( `Target: ${JSON.stringify( target )}` );

  highlightFrame( false );

  if ( gLastHighlightShip.length > 0 ) highlightShip( gLastHighlightShip[ 1 ], gLastHighlightShip[ 0 ], false );
  if ( gLastHighlight.length > 0 )     highlightAttacker( false, gLastHighlight );
  if ( gLastHighlightAggro.length > 0 ) highlightAggressor( false, gLastHighlightAggro );

  highlightShip( invIndex, teamIDX, true );
  gLastHighlightShip = [ teamIDX, invIndex ];

  if ( target.victim ) {
    highlightAttacker( true, target.attackers );
    gLastHighlight = target.attackers;
  } else {
    gLastHighlight = [];
  }

  if ( target.aggressor !== undefined ) {
    highlightAggressor( true, target.aggressor );
    gLastHighlightAggro = target.aggressor;
  } else {
    gLastHighlightAggro = [];
  }
}

function buildInfoDiv() {
  return [
    '<div id="replayInfoDiv" class="absolute">',
    '<table style="background-color: black;">',
    '<tr><td>Name:</td><td><div id="RIDname"></div></td><td>Corp:</td><td><div id="RIDcorp"></div></td><td style="text-align: right;"><img src="./close.png" id="closeButton" onclick="closeRIDbox()"></td></tr>',
    '<tr><td>Ship:</td><td><div id="RIDship"></div></td><td>Alliance:</td><td colspan ="2"><div id="RIDalliance"></div></td></tr>',
    '<tr><td>Class:</td><td><div id="RIDclass"></div></td><td>Kills:</td><td><div id="RIDkills"></div></td></tr>',
    '<tr id="killedRow"><td>Killed:</td><td><div id="RIDkilled"></div></td><td>IskLost:</td><td><div id="RIDisk"></div></td></tr>',
    '</table>',
    '</div>'
  ];
}

function closeRIDbox() {
  $( '#replayInfoDiv' ).hide();
  highlightAttacker( false, gLastHighlight );
  highlightAggressor( false, gLastHighlightAggro );
  highlightShip( gLastHighlightShip[ 1 ], gLastHighlightShip[ 0 ], false );
  gLastHighlight      = [];
  gLastHighlightAggro = [];
  gLastHighlightShip  = [];
  highlightFrame( true );
}

function addOffset( endTime ) {
  if ( endTime > gAnimationOffset ) {
    gAnimationOffset += gAnimationSpeed;
  } else {
    gAnimationPlaying = false;
  }
  refresh();
}

function reduceOffset() {
  if ( 0 < gAnimationOffset ) gAnimationOffset--;
  refresh();
}

function startOffset() {
  gAnimationOffset = 0;
  refresh();
}

function endOffset( endTime ) {
  gAnimationOffset = endTime;
  refresh();
}

function playOffset( endTime ) {
  if ( !gAnimationPlaying ) {
    gAnimationPlaying = true;
    playLoop( endTime );
  }
}

function pauseOffset() {
  if ( gAnimationPlaying ) gAnimationPlaying = false;
}

function playLoop( endTime ) {
  if ( gAnimationPlaying ) {
    addOffset( endTime );
    setTimeout( () => { playLoop( endTime ); }, 500 );
  }
}

function offsetInputChange() {
  gAnimationOffset = $( '#offsetInput' ).val();
  refresh();
}

function getAttackers( killmail_id ) {
  const thisKill = gData.find( kill => kill.killmail_id === killmail_id );
  return thisKill.attackers.map( attacker => attacker.character_id );
}

function getAttackersAndShip( killmail_id ) {
  const thisKill = gData.find( kill => kill.killmail_id === killmail_id );
  return thisKill.attackers.map( attacker => [ attacker.character_id, attacker.ship_type_id ]);
}

function buildMainWindow( involved ) {
  const html = [ '<table class="view-involved"><tr class="view-involved">' ];
  involved.forEach(( team, teamIDX ) => {
    html.push( ...buildTeamHeading( team, teamIDX ));
  });
  html.push( '</tr></table>' );
  return html;
}

function buildTeamHeading( team, teamIDX ) {
  const html = [
    '<td>',
    '<table>',
    '<tr>',
    `<div class="animIsk" id="team${teamIDX}isk"></div>`,
    `<div id="team${teamIDX}chart"></div>`,
    '</tr>',
    '</table>'
  ];

  let workTeam = team;
  if ( gShowKillsOnly ) {
    const offsetTime = new Date( Date.parse( gMinDateTime ) + ( 60000 * gAnimationOffset ));
    workTeam = team.filter( member => {
      const thisTime = new Date( member.time );
      return thisTime <= offsetTime && member.victim;
    });
  }

  let blockList;
  if ( gAnimationGroup === 'Type' ) {
    const grouped = workTeam.reduce(( acc, member ) => { ( acc[ member.shipData.I ] ??= [] ).push( member ); return acc; }, {});
    blockList = Object.values( grouped ).sort(( a, b ) => a[ 0 ].shipData.O - b[ 0 ].shipData.O );
  } else if ( gAnimationGroup === 'Class' ) {
    const grouped = workTeam.reduce(( acc, member ) => { ( acc[ member.shipData.G ] ??= [] ).push( member ); return acc; }, {});
    blockList = Object.values( grouped );
  } else {
    blockList = [ workTeam ];
  }

  if ( gAnimationSort && gAnimationGroup !== 'None' ) {
    blockList = [ ...blockList ].sort(( a, b ) => b.length - a.length );
  }

  blockList.forEach( block => { html.push( ...buildBlock( block, teamIDX )); });
  html.push( '</td>' );
  return html;
}

function buildBlock( block, teamIDX ) {
  return [ ...buildBlockHeading( block ), ...buildBlockBody( block, teamIDX ) ];
}

function buildBlockHeading( block ) {
  const html = [];
  if ( gAnimationLabel ) {
    const offsetTime = new Date( Date.parse( gMinDateTime ) + ( 60000 * gAnimationOffset ));
    let iskLost = 0, blockLoss = 0;
    block.forEach( invEntry => {
      const thisTime = new Date( invEntry.time );
      if ( thisTime <= offsetTime && invEntry.victim ) {
        iskLost += invEntry.iskLost;
        blockLoss++;
      }
    });
    const lossText  = blockLoss > 0 ? `<br>${blockLoss} lost, ${roundIsk( iskLost )} Isk</td>` : '';
    const labelText = gAnimationGroup === 'Type'  ? `${block[ 0 ].shipData.N} [${block.length}]`
                    : gAnimationGroup === 'Class' ? `${block[ 0 ].shipData.G} [${block.length}]`
                    :                              `All Ships [${block.length}]`;
    html.push( '<table><tr>' );
    html.push( `<td colspan="10">${labelText}${lossText}` );
    html.push( '</tr></table>' );
  }
  return html;
}

function buildBlockBody( block, teamIDX ) {
  const html         = [ '<table><tr>' ];
  let   counter      = 0;
  const iconWidth    = gAnimationScale ? 38 : 22;
  const docWidth     = $( document ).width();
  let   calcWidth    = Math.round(( ( docWidth / gCalculatedInvolved.length ) - ( iconWidth * 2 )) / iconWidth );
  const squarewidth  = Math.ceil( Math.sqrt( block.length ));
  if ( squarewidth < calcWidth ) calcWidth = squarewidth;

  block.forEach( blockShip => {
    if ( counter === calcWidth ) {
      html.push( '</tr><tr>' );
      counter = 0;
    }
    const id        = `p${blockShip.index}-${teamIDX}`;
    const titleText = `${blockShip.playerName} [${blockShip.corporation_name}] ${blockShip.shipData.N}: ${blockShip.kills} kills`;
    html.push( ...buildShipIcon( id, teamIDX, blockShip.shipID, titleText ));
    counter++;
  });
  html.push( '</tr></table>' );
  return html;
}

function buildShipIcon( id, teamIDX, shipIndex, titleText ) {
  const rowClass  = `${TEAM_COLORS[ teamIDX ]}Odd`;
  const invIndex  = id.substr( 1, id.indexOf( '-' ) - 1 );
  const scale     = gAnimationScale ? 32 : 16;
  return [
    `<td id="${id}" class="animAttacker ${rowClass}">`,
    `<img style="width: ${scale}px;" class="AnimIMG" src="https://image.eveonline.com/Render/${shipIndex}_32.png" title="${titleText}" onclick="setRIDtext(${teamIDX},${invIndex})">`,
    '</td>'
  ];
}

function highlightFrame( enableFlag ) {
  gAttackersThisFrame.forEach( attacker => {
    $( `#${attacker}` ).toggleClass( `${TEAM_COLORS[ attacker.substr( attacker.indexOf( '-' ) + 1 ) ]}Odd`, !enableFlag );
    $( `#${attacker}` ).toggleClass( 'KillHighLight', enableFlag );
  });
  gDiedSoFar.forEach( died => {
    $( `#${died}` ).toggleClass( `${TEAM_COLORS[ died.substr( died.indexOf( '-' ) + 1 ) ]}Odd`, !enableFlag );
    $( `#${died}` ).toggleClass( 'KillHighLightLong', enableFlag );
  });
  gDiedThisFrame.forEach( died => {
    $( `#${died}` ).toggleClass( `${TEAM_COLORS[ died.substr( died.indexOf( '-' ) + 1 ) ]}Odd`, !enableFlag );
    $( `#${died}` ).toggleClass( 'DiedHighLight', enableFlag );
  });
}

function highlightAttacker( enableFlag, attackers ) {
  attackers.forEach( attacker => {
    $( `#p${attacker[ 1 ]}-${attacker[ 0 ]}` ).toggleClass( `${TEAM_COLORS[ attacker[ 0 ] ]}Odd`, !enableFlag );
    $( `#p${attacker[ 1 ]}-${attacker[ 0 ]}` ).toggleClass( 'KillHighLight', enableFlag );
  });
}

function highlightAggressor( enableFlag, aggressors ) {
  aggressors.forEach( aggressor => {
    $( `#p${aggressor[ 3 ]}-${aggressor[ 2 ]}` ).toggleClass( `${TEAM_COLORS[ aggressor[ 2 ] ]}Odd`, !enableFlag );
    $( `#p${aggressor[ 3 ]}-${aggressor[ 2 ]}` ).toggleClass( 'DiedHighLight', enableFlag );
  });
}

function highlightShip( invIndex, teamIDX, enableFlag ) {
  $( `#p${invIndex}-${teamIDX}` ).toggleClass( `${TEAM_COLORS[ teamIDX ]}Odd`, !enableFlag );
  $( `#p${invIndex}-${teamIDX}` ).toggleClass( 'KillHighLightYellow', enableFlag );
}

function preCalcInvolvedData( involved ) {
  const CHARACTER_ID = 0;
  const SHIP_ID      = 1;
  const newInvolved  = involved;
  newInvolved.forEach(( team ) => {
    team.forEach(( invEntry, invIndex ) => { invEntry.index = invIndex; });
  });
  newInvolved.forEach(( team, teamIDX ) => {
    team.forEach(( invEntry, invIndex ) => {
      if ( invEntry.victim ) {
        const attackers = getAttackersAndShip( invEntry.killmail_id );
        attackers.forEach( attacker => {
          involved = markAttacker( attacker[ CHARACTER_ID ], attacker[ SHIP_ID ], involved, invEntry.time, invEntry.killmail_id, teamIDX, invIndex );
        });
        const killDetails = gData.find( kill => kill.killmail_id === invEntry.killmail_id );
        invEntry.damage_taken = killDetails.victim.damage_taken;
        invEntry.iskLost      = killDetails.zkb.totalValue;
      }
    });
  });
  return newInvolved;
}

function markAttacker( playerID, shipID, involved, killTime, killmail_id, tIDX, iIndex ) {
  let marked = false;
  involved.forEach(( team, teamIDX ) => {
    if ( !marked ) {
      let matches = team.filter( invEntry => invEntry.playerID === playerID && invEntry.shipID === shipID );
      if ( matches.length > 1 ) {
        matches = [ ...matches ].sort(( a, b ) => a.time > b.time ? 1 : -1 );
        matches.forEach(( invEntry, invIndex ) => {
          let markThis = false;
          if ((( invEntry.time >= killTime && invEntry.victim ) || invIndex === ( matches.length - 1 )) && !marked ) markThis = true;
          else if ( !invEntry.victim && !marked ) markThis = true;
          if ( markThis ) {
            if ( team[ invEntry.index ].aggressor === undefined ) team[ invEntry.index ].aggressor = [];
            team[ invEntry.index ].aggressor.push([ killTime, killmail_id, tIDX, iIndex ]);
            if ( involved[ tIDX ][ iIndex ].attackers === undefined ) involved[ tIDX ][ iIndex ].attackers = [];
            involved[ tIDX ][ iIndex ].attackers.push([ teamIDX, invEntry.index ]);
            marked = true;
          }
        });
      }
      if ( matches.length === 1 ) {
        if ( team[ matches[ 0 ].index ].aggressor === undefined ) team[ matches[ 0 ].index ].aggressor = [];
        team[ matches[ 0 ].index ].aggressor.push([ killTime, killmail_id, tIDX, iIndex ]);
        if ( involved[ tIDX ][ iIndex ].attackers === undefined ) involved[ tIDX ][ iIndex ].attackers = [];
        involved[ tIDX ][ iIndex ].attackers.push([ teamIDX, matches[ 0 ].index ]);
        marked = true;
      }
    }
  });
  return involved;
}

function calcFirstSeenTime( involved ) {
  involved.forEach(( team ) => {
    team.forEach( invEntry => {
      let firstTime = -1;
      let lastTime  = -1;
      if ( invEntry.aggressor !== undefined ) {
        invEntry.aggressor.forEach( target => {
          if ( target[ 0 ] < firstTime || firstTime === -1 ) firstTime = target[ 0 ];
          if ( target[ 0 ] > lastTime  || lastTime  === -1 ) lastTime  = target[ 0 ];
        });
      }
      if ( invEntry.victim ) {
        if ( invEntry.time < firstTime || firstTime === -1 ) firstTime = invEntry.time;
        if ( invEntry.time > lastTime  || lastTime  === -1 ) lastTime  = invEntry.time;
      }
      invEntry.firstSeenTime = firstTime;
      invEntry.lastSeenTime  = lastTime;
    });
  });
  return involved;
}

function timeOutTest() {
  gTimeoutFlag = true;
}

let gTimeoutFlag = false;

function generateAnimation( target ) {
  $( target ).append( 'Please Wait... Building Replay' );
  $( '#status' ).text( 'Please Wait... Building Replay' );
  const involved = [];
  if ( flagInvolvedRefresh ) {
    setTimeout( () => {
      subCalculation( target, involved );
      $( '#status' ).text( 'Replay Built.' );
    }, 100 );
  } else {
    subGenerateAnimation( target, gCalculatedInvolved );
    $( '#status' ).text( 'Replay Built.' );
  }
}

function subCalculation( target, involved ) {
  const returnValue = buildInvolved();
  const teamLosses  = returnValue.pop();
  let   inv         = returnValue.pop();
  profile( 'preCalcInvolvedData', () => { inv = preCalcInvolvedData( inv ); });
  profile( 'calcFirstSeenTime',   () => { inv = calcFirstSeenTime( inv );   });
  gCalculatedInvolved  = inv;
  flagInvolvedRefresh  = false;
  subGenerateAnimation( target, inv );
}

function subGenerateAnimation( target, involved ) {
  let minTime = 0;
  let maxTime = 0;
  involved.forEach( team => {
    team.forEach( invEntry => {
      if ( invEntry.victim ) {
        if ( invEntry.time > maxTime || maxTime === 0 ) maxTime = invEntry.time;
        if ( invEntry.time < minTime || minTime === 0 ) minTime = invEntry.time;
      }
    });
  });

  gMaxDateTime     = new Date( maxTime );
  gMinDateTime     = new Date( minTime );
  const timeSpan   = ( gMaxDateTime - gMinDateTime ) / 1000 / 60;

  const sel = ( id, val ) => `<option ${val === id ? 'selected' : ''}>${id}</option>`;
  const html = [
    `Start: ${minTime} End: ${maxTime} Duration:${timeSpan} mins`,
    ' | Group by: ',
    `<select class="animButtons ui-state-default" id="ux-animationGroupBy" onchange="setAnimationGroup()">`,
    sel( 'Type',  gAnimationGroup ), sel( 'Class', gAnimationGroup ), sel( 'None', gAnimationGroup ),
    '</select>',
    '  Filter: ',
    `<select class="animButtons ui-state-default" id="ux-animationFilter" onchange="setAnimationFilter()">`,
    `<option ${gShowKillsOnly  ? 'selected' : ''}>Kills</option>`,
    `<option ${!gShowKillsOnly ? 'selected' : ''}>All</option>`,
    '</select>',
    '  Speed: ',
    `<select class="animButtons ui-state-default" id="ux-animationSpeed" onchange="setAnimationSpeed()">`,
    sel( 1, gAnimationSpeed ), sel( 5, gAnimationSpeed ), sel( 10, gAnimationSpeed ),
    '</select>',
    '  Show Labels: ',
    `<select class="animButtons ui-state-default" id="ux-animationLabel" onchange="setAnimationLabel()">`,
    `<option ${gAnimationLabel  ? 'selected' : ''}>On</option>`,
    `<option ${!gAnimationLabel ? 'selected' : ''}>Off</option>`,
    '</select>',
    '  Sort: ',
    `<select class="animButtons ui-state-default" id="ux-animationSort" onchange="setAnimationSort()">`,
    `<option ${gAnimationSort  ? 'selected' : ''}>Size</option>`,
    `<option ${!gAnimationSort ? 'selected' : ''}>Value</option>`,
    '</select>',
    '  Scale: ',
    `<select class="animButtons ui-state-default" id="ux-animationScale" onchange="setAnimationScale()">`,
    `<option ${gAnimationScale  ? 'selected' : ''}>100%</option>`,
    `<option ${!gAnimationScale ? 'selected' : ''}>50%</option>`,
    '</select>',
    '<br>',
    '<table><tr><td>',
    '<button id="playButton"    class="animButtons">></button>',
    '<button id="pauseButton"   class="animButtons">||</button>',
    '<button id="startButton"   class="animButtons">|<</button>',
    '<button id="backButton"    class="animButtons"><<</button>',
    '<button id="forwardButton" class="animButtons">>></button>',
    '<button id="endButton"     class="animButtons">>|</button>',
    '<td><div id="progressbar" class="animationbar"></div></td>',
    `<td> : <input id="offsetInput" class="ui-state-default ux-offset animButtons" value="${gAnimationOffset}" type="number" min="0" max="${timeSpan}" readonly> mins</td>`,
    '</tr></table>',
    'To use this replay, hit the play button above, adjust the time manually, and adjust the filters, speed and layout',
    '<div id="mainTreeDiv"></div>',
    ...buildInfoDiv(),
    ...buildMainWindow( involved )
  ];

  $( target ).empty().append( html.join( '' ));

  const offsetTime       = new Date( Date.parse( gMinDateTime ) + ( 60000 * gAnimationOffset ));
  let   attackersThisFrame = [];
  let   attackersSoFar   = [];
  let   diedSoFar        = [];
  let   diedThisFrame    = [];
  const iskLostTeam      = [];

  involved.forEach(( team, teamIdx ) => {
    let iskLost = 0;
    team.forEach(( invEntry, invIndex ) => {
      if ( invEntry.victim ) {
        const thisTime = new Date( invEntry.time );
        if ( thisTime <= offsetTime ) {
          diedSoFar.push( `p${invIndex}-${teamIdx}` );
          if ( offsetTime - thisTime < ( 60000 * gAnimationSpeed )) {
            diedThisFrame.push( `p${invIndex}-${teamIdx}` );
          }
          iskLost += invEntry.iskLost;
        }
      }
      if ( invEntry.aggressor !== undefined ) {
        let addedFlag = false;
        invEntry.aggressor.forEach( aggro => {
          const thisTime = new Date( aggro[ 0 ] );
          if ( thisTime <= offsetTime && !addedFlag ) {
            if ( offsetTime - thisTime < ( 60000 * gAnimationSpeed )) {
              attackersThisFrame.push( `p${invIndex}-${teamIdx}` );
              addedFlag = true;
            }
            attackersSoFar.push( `p${invIndex}-${teamIdx}` );
          }
        });
      }
    });
    iskLostTeam.push( iskLost );
  });

  attackersThisFrame = [ ...new Set( attackersThisFrame ) ];
  attackersSoFar     = [ ...new Set( attackersSoFar ) ];
  diedSoFar          = [ ...new Set( diedSoFar ) ];
  diedThisFrame      = [ ...new Set( diedThisFrame ) ];

  gAttackersThisFrame = attackersThisFrame;
  gDiedSoFar          = diedSoFar;
  gDiedThisFrame      = diedThisFrame;

  highlightFrame( true );

  const totalIskLost = iskLostTeam.reduce(( s, v ) => s + v, 0 );
  involved.forEach(( team, teamIdx ) => {
    const efficiency = iskLostTeam[ teamIdx ] > 0
      ? Math.round10( 100 - (( iskLostTeam[ teamIdx ] / totalIskLost ) * 100 ), -1 )
      : 100;
    $( `#team${teamIdx}isk` ).empty().append( `${roundIsk( iskLostTeam[ teamIdx ] )} Isk Lost, Efficiency: ${efficiency}%` );
  });

  gAnimationChartData  = [];
  gAnimationChartLabel = [];

  $( '#progressbar' ).slider({
    min:   0,
    max:   timeSpan,
    range: 'min',
    value: gAnimationOffset,
    stop:  ( event, ui ) => { gAnimationOffset = ui.value; refresh(); },
    slide: ( event, ui ) => { gAnimationOffset = ui.value; $( '#offsetInput' ).val( ui.value ); }
  });

  $( '#replayInfoDiv' ).hide();

  $( '#playButton'    ).button().click( () => { playOffset( timeSpan );  });
  $( '#pauseButton'   ).button().click( () => { pauseOffset();           });
  $( '#startButton'   ).button().click( () => { startOffset();           });
  $( '#endButton'     ).button().click( () => { endOffset( timeSpan );   });
  $( '#backButton'    ).button().click( () => { reduceOffset();          });
  $( '#forwardButton' ).button().click( () => { addOffset( timeSpan );   });
}

function generateInvolved( idToName ) {
  const width       = Math.round( 100 / gTeams.length );
  const returnValue = buildInvolved();
  const teamLosses  = returnValue.pop();
  const involved    = returnValue.pop();
  const totalLosses = returnValue.pop();

  const html = [ '<table class="view-involved"><tr class="view-involved">' ];
  profile( 'involved-htmlOutput', () => {
    involved.forEach(( team, teamIdx ) => {
      let oddRow = true;
      html.push( `<td class="view-involved" width=${width}%>` );
      html.push( '  <table class="view-involvedDetail ui-widget-content">' );
      html.push( '    <thead class="view-involvedHeader">' );
      html.push( '      <th colspan=2>Pilot/Ship</td>' );
      html.push( '      <th>Corp/Alliance</td>' );
      html.push( '    </thead>' );
      team.forEach( invEntry => {
        const rowClass = TEAM_COLORS[ teamIdx ] + ( invEntry.victim ? 'Kill' : oddRow ? 'Odd' : 'Even' );
        const rowData  = generateKillMailCell( '', invEntry, totalLosses - teamLosses[ teamIdx ], idToName );
        html.push( TableRow( rowClass, rowData ));
        oddRow = !oddRow;
      });
      html.push( '  </table>' );
      html.push( '</td>' );
    });
    html.push( '</tr></table>' );
  });
  profile( 'involved-empty',  () => { document.getElementById( 'involvedTable' ).innerHTML = ''; });
  profile( 'involved-append', () => { document.getElementById( 'involvedTable' ).innerHTML = html.join( '' ); });
}

function generateKillMailCell( cellClass, invEntry, nonTeamLosses, idToName ) {
  const imageLink = eveImageLink( 'Render', invEntry.shipData.I );
  let leftUpperCell = zKillLink( 'character', invEntry.playerID, invEntry.playerName ) + ' ' + ( invEntry.podKillID === 0 ? '' : zKillLink( 'detail', invEntry.podKillID, '[Pod]' ));
  if ( invEntry.playerID === undefined ) {
    leftUpperCell = zKillLink( 'corporation', invEntry.corporation_id, idToName.get( invEntry.corporation_id ));
  }
  const leftLowerCell  = invEntry.shipData.N;
  const rightUpperCell = zKillLink( 'corporation', invEntry.corporation_id, idToName.get( invEntry.corporation_id ));
  const rightLowerCell = zKillLink( 'alliance',    invEntry.alliance_id,    idToName.get( invEntry.alliance_id ));

  let cellData = TableData( `view-involvedIcon ${cellClass}`, invEntry.victim ? zKillLink( 'kill', invEntry.killmail_id, imageLink ) : imageLink );
  cellData    += TableData( `teamText ${cellClass}`, Bold( leftUpperCell ) + '<br>' + leftLowerCell );
  if ( nonTeamLosses !== undefined ) {
    assert(( nonTeamLosses !== 0 ) || ( invEntry.kills !== 0 ));
    const percentage = nonTeamLosses === 0 ? 0 : Math.round( invEntry.kills / nonTeamLosses * 1000 ) / 10;
    cellData += TableData( `teamText ${cellClass} view-rightAlign`, `N&deg; ${invEntry.kills}<br>${percentage.toFixed( 1 )}%` );
  }
  cellData += TableData( `teamText ${cellClass}`, Bold( rightUpperCell ) + '<br>' + rightLowerCell );
  return cellData;
}

function generateBattleTimeline( target, idToName ) {
  gData.sort(( lhs, rhs ) => {
    if ( lhs.killmail_time === rhs.killmail_time ) return isCapsule( lhs.victim.ship_type_id ) - isCapsule( rhs.victim.ship_type_id );
    return lhs.killmail_time > rhs.killmail_time ? 1 : -1;
  });

  const dataByTime = gData.reduce(( acc, item ) => { ( acc[ item.killmail_time ] ??= [] ).push( item ); return acc; }, {});
  const teamHeaders = gTeams.map( () => '<th colspan=2 align="center">Pilot/Ship</th><th align="center">Alliance/Corp</th>' ).join( '' );
  const html = [ `<div><table class="view-timeline ui-widget-content"><thead><th align="center">Time</th>${teamHeaders}</thead>` ];

  let oddRow = true;
  Object.values( dataByTime ).forEach( event => {
    assert( event[ 0 ] !== undefined );
    assert( event[ 0 ].killmail_time !== undefined );
    const timeHeader = event[ 0 ].killmail_time.split( 'T' )[ 1 ].slice( 0, -3 );
    let   timeTitle  = timeHeader;
    let   timeRowClass = 'view-timelineTimeRow';
    const dataByTeam   = event.reduce(( acc, entry ) => {
      const team = getTeam( entry.victim.alliance_id === 0 ? entry.victim.corporation_id : entry.victim.alliance_id );
      ( acc[ team ] ??= [] ).push( entry );
      return acc;
    }, {});

    let index = 0;
    let found = true;
    let curTimeHeader    = timeHeader;
    let curTimeRowClass  = timeRowClass;

    while ( found ) {
      found = false;
      const htmlBlock = [ `<td class="${curTimeRowClass}" title="${timeTitle}">${curTimeHeader}</td>` ];
      for ( let teamIdx = 0; teamIdx < gTeams.length; ++teamIdx ) {
        const teamRecord = Array.from( dataByTeam[ teamIdx ] ?? [] );
        const cellClass  = TEAM_COLORS[ teamIdx ] + ( oddRow ? 'Odd' : 'Even' );
        let   cellData   = `<td class="${curTimeRowClass}" colspan=3 style="width: ${100 / gTeams.length}%;"></td>`;
        if ( index < teamRecord.length ) {
          const data     = teamRecord[ index ];
          found          = true;
          const invEntry = initInvolvedEntry( data.victim );
          invEntry.playerName  = idToName.get( data.victim.character_id );
          invEntry.playerID    = data.victim.character_id;
          invEntry.killmail_id = data.killmail_id;
          invEntry.victim      = true;
          invEntry.podKillID   = 0;
          invEntry.shipData    = gShipTypes.find( X => X.I === data.victim.ship_type_id );
          if ( invEntry.shipData === undefined ) invEntry.shipData = gShipTypes.find( X => X.I === 0 );
          cellData = generateKillMailCell( `${curTimeRowClass} ${cellClass}`, invEntry, undefined, idToName );
        }
        htmlBlock.push( cellData );
      }
      if ( found ) {
        oddRow = !oddRow;
        html.push( TableRow( 'view-timelineRow', htmlBlock.join( '' )));
        curTimeRowClass = '';
        curTimeHeader   = '';
      }
      ++index;
    }
  });

  html.push( '</table></div>' );
  $( target ).empty().append( html.join( '' ));
}
