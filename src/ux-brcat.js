function init() {
  gData = {};
  gDataCount = 0;
  gGroups = [];
  gPlayers = [];
  removeTeamTabs();
  gTeams = [];
  addTeamTabs();
  const gSelectedGroup = [];
  gKillCount = 0;
  gTasks = 0;

  gSummaryIskLost = 0;
  gSummaryShips = 0;
  gSummaryPods = 0;
  gTotalDamage = 0;
  $( '#ktl' ).empty();
  $( '#stl-div' ).empty();
  $( '#addBtn' ).empty();
  $( '#summaryTable' ).empty();
  $( '#summaryText' ).text( '' );
  $( '#tabs' ).tabs( refresh );
}

async function load_data_click() {
  gLoadTeams = [];
  await startParsing();
}

async function startParsing() {
  waitCursor( true );
  init();

  const opts = {
    lines:     16,
    length:    32,
    width:     5,
    radius:    5,
    corners:   1,
    rotate:    0,
    direction: 1,
    color:     '#FFFFFF',
    speed:     0.5,
    trail:     100,
    shadow:    true,
    hwaccel:   false,
    className: 'spinner',
    zIndex:    2e9
  };
  setTimeout( () => {
    const target = document.getElementById( 'ux-helpInfo' );
    gSpinner = new Spinner( opts ).spin( target );
  }, 500 );

  $( '#status' ).text( 'Fetching Data...' );
  $( '#status' ).addClass( 'ui-state-default ui-state-error' );

  updateShareLink();
  gProcessingTime = new Date();

  const useragent = 'user_agent=br.inyour.space+%28Lucia+Denniard%29';

  const zkillmails = [].concat( ...await Promise.all( gEntryWindowData.map( entryWindow => loadEntryWindowData( entryWindow ))));
  const killmails  = [].concat( ...await Promise.all( zkillmails.map( k => fetch( `https://esi.evetech.net/v1/killmails/${k.killmail_id}/${k.zkb.hash}?${useragent}` ).then( b => b.json().then( b2 => Object.assign( k, b2 ))))));

  console.log( 'kms:' );
  console.log( killmails );

  const { characterIDs, corporationIDs, allianceIDs } = [].concat( ...killmails.map(({ victim, attackers }) => [ victim ].concat( attackers ))).reduce(( p, { character_id, corporation_id, alliance_id }) => {
    if ( character_id )  p.characterIDs.add( character_id );
    if ( corporation_id ) p.corporationIDs.add( corporation_id );
    if ( alliance_id )   p.allianceIDs.add( alliance_id );
    return p;
  }, { characterIDs: new Set(), corporationIDs: new Set(), allianceIDs: new Set() });

  const ids = [
    ...Array.from( characterIDs ),
    ...Array.from( corporationIDs ),
    ...Array.from( allianceIDs ),
  ];

  const idToName = new Map([
    ...toMap( await chunkedJson( `https://esi.evetech.net/v2/universe/names/?${useragent}`, ids, 1000 ), 'id', 'name' )
  ]);

  for ( const element of killmails ) {
    if ( gData[ '' + element.killmail_id ] === undefined ) {
      ++gDataCount;
      gData[ '' + element.killmail_id ] = element;
      parseKillRecord( element, idToName );
    }
  }

  gData = Object.values( gData );

  if ( --gTasks <= 0 ) {
    $( '#status' ).text( 'Compiling pilot statistics...' );
    generateSummary( 0, 0, 0, false, idToName );

    const elapsed = ( new Date()).getTime() - gProcessingTime.getTime();
    console.log( `processing time: ${elapsed} ms` );

    build_data( idToName );
    $( '#status' ).text( 'Ready for team selection.' );
    if ( gSpinner !== undefined ) {
      gSpinner.stop();
      gSpinner = undefined;
    }
    refresh();
  }
  if ( gOptGotoReplay ) {
    $( '#tabs' ).tabs( 'option', 'active', 4 );
  }
  waitCursor( false );
}

function updateShareLink() {
  const base = window.location.href.split( '?' )[ 0 ] + '?';
  updateEntryDataFromUI();

  const param       = [];
  const systemParam = [];
  const startParam  = [];
  const endParam    = [];

  gEntryWindowData.forEach(( entryWindow ) => {
    const systemData = gSolarSystems.find( XX => XX.N === entryWindow.system );
    if ( systemData !== undefined ) {
      const startDelta = ( entryWindow.startTime - EVE_EPOCH ) / MS_PER_MINUTE;
      const endDelta   = ( entryWindow.endTime - entryWindow.startTime ) / MS_PER_MINUTE;
      systemParam.push( systemData.I - SOLAR_SYSTEM_INDEX_OFFSET );
      startParam.push( startDelta );
      endParam.push( endDelta );
    }
  });

  if ( systemParam.length > 0 ) {
    param.push( `s=${systemParam.join( SHARELINK_TOKEN )}` );
    param.push( `b=${[ ...new Set( startParam ) ].length === 1 ? startParam[ 0 ] : startParam.join( SHARELINK_TOKEN )}` );
    param.push( `e=${[ ...new Set( endParam ) ].length === 1 ? endParam[ 0 ] : endParam.join( SHARELINK_TOKEN )}` );
  }

  let teams = '';
  for ( let i = 0; i < gGroups.length; i += 3 ) {
    let digit = 0;
    if ( i + 2 < gGroups.length ) digit |= Math.max( 0, gGroups[ i + 2 ].team ) << 4;
    if ( i + 1 < gGroups.length ) digit |= Math.max( 0, gGroups[ i + 1 ].team ) << 2;
    digit |= Math.max( 0, gGroups[ i ].team );
    teams += TEAM_ENCODING[ digit ];
  }
  while ( teams.length > 1 && teams[ teams.length - 1 ] === 'a' ) {
    teams = teams.substring( 0, teams.length - 1 );
  }
  param.push( `t=${teams}` );
  if ( !gOptIgnoreInsig )          param.push( 'o=1' );
  if ( !gOptEstimateFighterValues ) param.push( 'f=1' );
  if ( !gAnimationScale )          param.push( 'rs=1' );
  if ( gAnimationOffset > 0 )      param.push( `ro=${gAnimationOffset}` );
  if ( gAnimationSort )            param.push( 'rt=1' );
  if ( gAnimationSpeed > 1 )       param.push( `rd=${gAnimationSpeed}` );
  if ( gShowKillsOnly )            param.push( 'rk=1' );
  if ( !gAnimationLabel )          param.push( 'rl=1' );
  if ( gAnimationGroup === 'Type' ) param.push( 'rg=1' );
  if ( gAnimationGroup === 'None' ) param.push( 'rn=1' );

  console.log( `${param.length}: ${param}` );
  $( '#ux-shareLink' ).val( base + param.join( '&' ));
  console.log( `Updating URL:${base}${param.join( '&' )}` );
  const teamGenerated = !param.includes( 't=' );
  console.log( teamGenerated );
  if (( base + param.join( '&' )) !== location.href && teamGenerated ) {
    history.replaceState( history.state, 'EVE Kill Report Repair Tool', `?${param.join( '&' )}` );
  }
}

function remove_team() {
  const oldTeam = gTeams.length - 1;
  const newTeam = oldTeam - 1;
  if ( oldTeam >= 2 ) {
    gTeams[ oldTeam ].forEach( member => {
      gTeams[ newTeam ].push( member );
      gGroups[ member ].team = newTeam;
    });
    delete_team( oldTeam );
  }
  flagInvolvedRefresh = true;
}

function refresh() {
  const now = Date.now();
  waitCursor( true );
  gTabs.forEach( tab => { tab.dirty = true; });
  draw_team_table( gTeams );
  const currentTab = $( '#tabs' ).tabs( 'option', 'active' );
  update_active_tab( gTabs[ currentTab ] );
  updateShareLink();
  waitCursor( false );
  console.log( 'refresh took', Date.now() - now );
}

function update_active_tab( activeTab ) {
  if ( activeTab.dirty ) {
    console.log( `redrawing ${activeTab.title}` );
    activeTab.populate();
    activeTab.dirty = false;
    $( '#tabs' ).tabs( refresh );
  }
}

function find_active_tab( ui ) {
  update_active_tab( gTabs.find( t => t.title === ui.newTab[ 0 ].textContent ));
}

function addTab( index, title, content, callback, defaultContent, cssclass ) {
  gTabs = gTabs.filter( TAB => TAB.index !== index );
  const tab = {
    index,
    title,
    content,
    defaultContent,
    cssclass,
    populate: callback,
    dirty: true
  };
  gTabs.push( tab );
  gTabs = [ ...gTabs ].sort(( a, b ) => a.index - b.index );
  $( '#tabs' ).tabs( 'destroy' );
  drawTabs();
  $( '#tabs' ).tabs({
    heightStyle: 'fill',
    show:     ( event, ui ) => { find_active_tab( ui ); },
    activate: ( event, ui ) => { find_active_tab( ui ); }
  });
  gTabs.forEach( tab => { $( `#ui-tabs${tab.index}` ).height( '' ); });
}

function removeTabs() {
  $( '#tabs' ).tabs( 'destroy' );
  drawTabs();
  $( '#tabs' ).tabs({ heightStyle: 'fill' });
}

function drawTabs() {
  const tabItems = gTabs.map( tab => `<li><a href="#ui-tabs${tab.index}">${tab.title}</a></li>` ).join( '' );
  const divItems = gTabs.map( tab => [
    `<div id="ui-tabs${tab.index}" style="height: 100%">`,
    `<div id="${tab.content}"`,
    tab.cssclass !== undefined ? ` class="${tab.cssclass}"` : '',
    ' style="width: 100%;">',
    tab.defaultContent !== undefined ? tab.defaultContent : '',
    '</div>',
    '</div>'
  ].join( '' )).join( '' );

  const ulText = `<ul id="ui-tabslist">${tabItems}<div id="addBtn" style="float: right;"></div></ul>`;
  $( '#tabs' ).empty().append( ulText + divItems );
}

function addTeamTabs( idToName ) {
  removeTeamTabs();
  gTeams.forEach(( team, index ) => {
    addTab( index + STARTING_TEAM_TAB, `Team ${index + 1}`, `teamSummary${index}`, () => { draw_team_kill_table( index, idToName ); });
  });
}

function removeTeamTabs() {
  for ( let teamIdx = 0; teamIdx < MAX_TEAMS; ++teamIdx ) {
    gTabs = gTabs.filter( tab => tab.index !== ( teamIdx + STARTING_TEAM_TAB ));
  }
}

function save_data() {
  $( '#status' ).text( 'Saving Battle Data...' );
  save_battle();
  $( '#status' ).text( 'Battle Data Saved' );
  draw_localStorageTable();
}

function load_data() {
}

function sort_teams() {
  gTeams.forEach(( team, teamIdx ) => {
    gTeams[ teamIdx ] = [ ...team ].sort(( a, b ) => gGroups[ b ].players - gGroups[ a ].players );
  });
  return gTeams;
}

function assign_team( newTeam, groupIdx ) {
  $( '#status' ).text( `Moving ${gGroups[ groupIdx ].name} to ${TEAM_COLORS[ newTeam ]}` );
  waitCursor( true );
  setTimeout( () => {
    if ( newTeam >= gTeams.length ) {
      addTab( newTeam + STARTING_TEAM_TAB, `Team ${newTeam + 1}`, `teamSummary${newTeam}`, () => { draw_team_kill_table( newTeam ); });
    }
    assign_group_to_team( newTeam, groupIdx );
    refresh();
    $( '#status' ).text( '' );
    waitCursor( false );
  }, 10 );
  flagInvolvedRefresh = true;
}

function generate_button_html( teamIdx, groupIdx, text ) {
  const colorText = TEAM_COLORS[ teamIdx ];
  return `<span class="ux-button ${colorText}" title="Move to ${colorText} team" onclick="assign_team(${teamIdx},${groupIdx})">${text}</span>`;
}

function generateCoalitionDropdown( teamIdx ) {
  const coalitionOptions = gCoalitionNames.map( coalition => `<option>${coalition}</option>` ).join( '' );
  const factionOptions   = gFactionData.map( faction => `<option>${faction.name}</option>` ).join( '' );
  return `<select class="ui-widget-content ui-state-default ux-coalitionDropdown" id="ux-coalitionDropdown${teamIdx}" onchange="setCoalition(${teamIdx})"><option>---</option>${coalitionOptions}${factionOptions}</select>`;
}

function setCoalition( teamIdx ) {
  let dirty = false;
  const dropdown = $( `#ux-coalitionDropdown${teamIdx}` );
  gCoalitionData.forEach( coalition => {
    if ( coalition.shortName === dropdown.val()) {
      gGroups.forEach(( group, groupIdx ) => {
        if ( group.team !== teamIdx && group.name === coalition.member && group.team !== -1 ) {
          dirty = true;
          assign_group_to_team( teamIdx, groupIdx );
        }
      });
    }
  });
  gFactionData.forEach( faction => {
    if ( faction.name === dropdown.val()) {
      gGroups.forEach(( group, groupIdx ) => {
        if ( group.team !== teamIdx && group.factionID === faction.id && group.team !== -1 ) {
          dirty = true;
          assign_group_to_team( teamIdx, groupIdx );
        }
      });
    }
  });
  if ( dirty ) refresh();
  dropdown.val( '---' );
}

function draw_team_table( newData ) {
  $( '#stl-div' ).empty();

  const width     = Math.floor( 100 / newData.length );
  let tableData   = '<table class="ux-selTbl ux-selMain ui-widget-content ui-corner-all">';

  newData.forEach(( team, teamIdx ) => {
    let oddOrEven   = 0;
    let memberCount = 0;
    let tableContent = '';

    team.forEach( teamMember => {
      const groupEntry = `<div class="ux-listitem teamText" title="${gGroups[ teamMember ].name}">(${gGroups[ teamMember ].players}) ${gGroups[ teamMember ].name}</div>`;
      const buttonPrev = teamIdx !== 0 ? generate_button_html( teamIdx - 1, teamMember, '&lt;&lt;' ) : '';
      const buttonNext = teamIdx <= newData.length && teamIdx < ( MAX_TEAMS - 1 ) ? generate_button_html( teamIdx + 1, teamMember, '&gt;&gt;' ) : '';

      const rowData = TableData( 'ux-navPrev', buttonPrev ) + TableData( 'ux-groupData', groupEntry ) + TableData( 'ux-navNext', buttonNext );
      tableContent += TableRow( `ux-selTbl-Row ui-widget-content ${TEAM_COLORS[ teamIdx ]}${ODD_EVEN[ oddOrEven ]}`, rowData );
      memberCount += gGroups[ teamMember ].players;
      oddOrEven = 1 - oddOrEven;
    });

    const iskSummary    = getIskSummary();
    const teamIskValues = iskSummary[ 0 ];
    const teamShipsLost = iskSummary[ 1 ];
    const shipsLost     = teamShipsLost[ teamIdx ];
    const iskLost       = teamIskValues[ teamIdx ];
    const iskTotal      = teamIskValues.reduce(( sum, isk ) => sum + isk, 0 );
    const efficiency    = iskTotal === 0 ? 100 : Math.round10( 100 - (( iskLost / iskTotal ) * 100 ), -1 );

    const removeBtn = teamIdx > 1 && teamIdx === gTeams.length - 1
      ? '<span class="ux-button Gray" title="Remove this team" onclick="remove_team()">x</span>'
      : '';

    tableData += `  <td class="ux-selTbl" width=${width}%>`;
    tableData += '    <table class="ux-selTblInner">';
    tableData += '      <col class="ux-navPrev"><col class="ux-groupData"><col class="ux-navNext">';
    tableData += '      <tr class="ux-selTblHeaderRow">';
    tableData += `        <td colspan=2><table width="100%" class="ux-selTblHeader"><tr><td>${TEAM_COLORS[ teamIdx ]} (${memberCount})</td>`;
    tableData += `        <td align="right">Assign coalition ${generateCoalitionDropdown( teamIdx )}</td></tr></table>`;
    tableData += `        <td>${removeBtn}</td>`;
    tableData += '      </tr>';
    tableData += `<tr><td colspan="3">${roundIsk( iskLost )} Isk lost, Efficiency: ${efficiency}%, ${shipsLost} Ships lost</td></tr>`;
    tableData += tableContent;
    tableData += '    </table>';
    tableData += '  </td>';
  });

  tableData += '</tr>';
  $( '#stl-div' ).append( tableData );
  $( '.ux-coalitionDropdown option' ).hover( e => { console.log( e.target ); });
}

function changeTheme() {
  gTheme = $( '#ux-themeDropdown' ).val();
  const newTheme = gTheme === 'custom'
    ? './jquery-ui-1.11.2.custom/jquery-ui.css'
    : `//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/${gTheme}/jquery-ui.min.css`;
  $( '#theme_css' ).attr( 'href', newTheme );
  console.log( `changeTheme: setting theme to ${gTheme}` );
  writeCookies();
}
