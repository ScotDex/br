const ODD_EVEN    = [ 'Odd', 'Even' ];
const TEAM_COLORS = [ 'Blue', 'Red', 'Green', 'Purple', 'Yellow', 'Orange' ];
const TEAM_COLORS_LOWER_CASE = [ 'blue', 'red', 'green', 'purple', 'yellow', 'orange' ];

const SHARELINK_TOKEN       = ',';
const SOLAR_SYSTEM_INDEX_OFFSET = 30000000;
const TEAM_ENCODING = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$';

let gSpinner;

const TEAM_BLUE   = 0;
const TEAM_RED    = 1;
const TEAM_YELLOW = 2;
const TEAM_GREEN  = 3;
const TEAM_ORANGE = 4;
const TEAM_PURPLE = 5;

const MAX_TEAMS          = 4;
const STARTING_TEAM_TAB  = 100;

const DEBUG_SHIP   = 'XXX';
const DEBUG_PLAYER = 'XXX';

const COOKIE_THEME          = 'newtheme';
const COOKIE_BLUETEAMS      = 'blueTeams';
const COOKIE_BLUETEAMS_TOKEN = '|';
const DAYS_PER_YEAR = 365;
const MS_PER_MINUTE = 1000 * 60;
const MS_PER_SECOND = 1000;
const EVE_EPOCH     = Date.UTC( 2003, 0, 1 );

let gValidateFlag = false;
let gSolarSystems = [];
let gJumpData     = [];
let gData         = {};
let gDataCount    = 0;
let gTabs         = [];
const gShipTypes      = initShipTypes();
const gCoalitionData  = initCoalitions();
const gCoalitionNames = [ ...new Set( gCoalitionData.map( c => c.shortName ) ) ].sort();
const gFactionData    = initFactions();
let gGroups       = [];
let gPlayers      = [];
let gTeams        = [];
let gSelectedGroup = [];
let gKillCount    = 0;
let gProcessingTime = new Date();
let gSummaryIskLost = 0;
let gSummaryShips   = 0;
let gSummaryPods    = 0;
let gTotalDamage    = 0;
let gBlueTeams      = [];
let gTheme;
let gActiveChart     = 'kill';
let gActiveChartType = 'column';
let gCurrentTeams    = [];
let gDataSets        = [];

let gLoadUrl           = false;
let gLoadTeams         = [];
let gEntryWindowData   = [];
let gTasks             = 0;
let gWaitCursor        = 0;

let gAnimationGroup  = 'Class';
let gAnimationOffset = 0;
let gAnimationPlaying = false;
let gAnimationWidth  = 10;
let gAnimationSpeed  = 1;
let gShowKillsOnly   = false;
let gAnimationLabel  = true;
let flagInvolvedRefresh = true;
let gAnimationSort   = false;
let gAnimationScale  = true;
let gOptGotoReplay   = false;
let gAnimationChartData  = [];
let gAnimationChartLabel = [];
let gLastHighlight       = [];
let gLastHighlightAggro  = [];
let gLastHighlightShip   = [];

let gMaxDateTime = 0;
let gMinDateTime = 0;

$( document ).ready( on_page_ready );

function readCookies() {
  const blueTeams = $.cookie( COOKIE_BLUETEAMS );
  if ( blueTeams !== undefined ) gBlueTeams = blueTeams.split( COOKIE_BLUETEAMS_TOKEN );
  gTheme = $.cookie( COOKIE_THEME );
  console.log( `readCookies: newtheme=${gTheme}` );
}

function writeCookies() {
  console.log( gBlueTeams.join( COOKIE_BLUETEAMS_TOKEN ));
  if ( gLoadTeams.length === 0 )
    $.cookie( COOKIE_BLUETEAMS, gBlueTeams.join( COOKIE_BLUETEAMS_TOKEN ), { expires: DAYS_PER_YEAR, path: '/' });
  if ( gTheme !== undefined )
    $.cookie( COOKIE_THEME, gTheme, { expires: DAYS_PER_YEAR, path: '/' });
}

function on_page_ready() {
  readCookies();

  if ( gTheme !== undefined ) {
    console.log( `on_page_ready: setting theme to ${gTheme}` );
    $( '#ux-themeDropdown' ).val( gTheme );
    changeTheme();
  } else {
    $( '#ux-themeDropdown' ).val( 'custom' );
  }
  get_solarsystemIDs();

  processUrlParameters();

  if ( gEntryWindowData.length === 0 ) {
    const now = new Date();
    gEntryWindowData.push({
      endTime:   now.getTime(),
      startTime: now.getTime() - 90 * MS_PER_MINUTE
    });
  }

  generateEntryUIFromData();

  $( '#tabs' ).tabs({ heightStyle: 'fill' });

  const helpTxt = `<div id="ux-helpInfo" class="ux-helpContent">
<b>Battle Report Generator</b>
<br>version {{VERSION}}
<br>This version was updated to use ESI by Lucia Denniard, with performance fixes from robbilie.
<br><br>Please file bugs here <a href="https://github.com/andimiller/br/issues">https://github.com/andimiller/br/issues</a>, or bother me on discord/slack, see original release notes below.
<br>
<br>version 0.1.306 - 17th December 2016
<br>
<br>If you are having issues with this tool not loading, please clear cookies or use incognito mode
<br>
<br>This tool is for generating battle reports from killmails held on zKillboard.com.
<br>
<br><b>How to use:</b>
<br>
<br><b>Step 1</b>
<br>First, get some data to analyze.
<br>If you clicked a link to an already created battle report, you can skip to step 3
<br>
<br>Method A
<br>Type a system name into the System/Link box, it can autocomplete, showing the Region names for info.
<br>Specify a start and end to the battle. All times are Eve time (GMT).
<br> If additional systems or timespans are needed, click the plus button to add another System/Link box
<br>Click the analyze button to begin the data transfer from zKill to your battle report.
<br>
<br>Method B
<br>Copy a battle report url from evekill.net, and paste it into the System/Link box.
<br> This is ideally a related kill link, but individual killmail links will work too.
<br>Click the analyze button to begin the data transfer from zKill to your battle report.
<br> The battle location and time will be read from the evekill link and used to fill in the system and time values.
<br> Data transfer from zKill will begin automatically.
<br>
<br><b>Step 2</b>
<br>Once the data is loaded, you can assign the teams.
<br>Click the colored buttons to assign a corp or alliance to a team. Up to 4 teams can be created.
<br> Alternatively you can add groups of players according to coalition or faction warfare affiliation.
<br> Note: the coalition list is manually updated. Errors/Additions can be fixed/added by contacting me.
<br> Use the assign coalition dropdown on the team you want those members assigned, and they will all move to that team
<br>At any point you can use the various views to help you figure out who was shooting who.
<br>
<br><b>Step 3</b>
<br>Check out the battle, there are a number of different ways to check out the data.
<br><b>Involved:</b> Shows a list of the involved ships, destroyed ships are highlighted
<br><b>Class Summary:</b> Shows a summary of the classes of ship used, lost and the isk losses
<br><b>Ship Summary:</b> Shows a summary of the types of ship used, lost and the isk losses
<br><b>Timeline:</b> Shows a list of the kills for each team, in matched time increments
<br><b>Replay:</b> (New) Use the time slider, or play controls and click on the ship icons for kill info and highlighting
<br><b>Team Kill Lists:</b> A standard list of kills for each team.
<br><b>Chart:</b> Various charts including isk losses over time.
<br><b>Kill List:</b> A standard list of every kill.
<br><b>Options:</b> Set options here. Currently you can disable the anti clutter ignore insignifigant groups option. NPSI requested.
<br><b>Help &amp; Info:</b> This page
<br>
<br><b>Step 4</b>
<br>Share the battle you have fixed, copy the contents of the Share Link box.
<br>The url generated will automatically rebuild the BR with the teams you set.
<br> It will also store the replay state, so you can share a specific time in the battle, or a replay layout
<br>
<br>
<br>
<br>For info and suggestions evemail SmallFatCat or join "BRcat support" in game
<br>Developed using the zKillboard API, Eve API and the help and code of Pink Fuzz
<br>Coalition data from <a href="http://rischwa.net/coalitions/">http://rischwa.net/coalitions/</a> (21st August 2015)
<br>All CCP assets and Eve assets remain property of CCP Games.
<br>Donate isk to SmallFatCat to support continued development
<br>
<br>
<br>Powered by: <a href="https://zkillboard.com/">zKillboard</a>, <a href="http://eve-kill.net/?a=home">eve-kill.net</a>, <a href="https://www.eveonline.com">CCP's Eve Online API</a>. Hosted by Ever Flow [EVF], a no drama eve corporation, check us out in game
</div>`;

  addTab( 990, 'Options',   'options',    () => generateOptionsTab( '#options' ) );
  addTab( 999, 'Help & Info', 'infoTable', () => { $( '#infoTable' ).html( helpTxt ); });
  $( '#tabs' ).tabs({ active: 1 });

  if ( gLoadUrl ) {
    setTimeout( () => startParsing(), 200 );
  }
  $( window ).resize( () => refresh() );
  window.onpopstate = e => {
    processUrlParameters();
    if ( gLoadUrl ) setTimeout( () => { startParsing(); refresh(); }, 200 );
  };
}

function generateEntryUIFromData() {
  const rows = gEntryWindowData.map(( _, index ) => createEntryTableRow( index )).join( '' );
  $( '#ux-entryWindow' ).empty().append( `<table class="ux-entry">${rows}</table>` );
  updateEntryUIFromData();
}

function updateEntryUIFromData() {
  gEntryWindowData.forEach(( entryWindow, index ) => {
    uiSetDateTime( entryWindow.startTime, '#start', index );
    uiSetDateTime( entryWindow.endTime,   '#end',   index );

    $( `#system${index}` ).autocomplete({
      source( request, response ) {
        if ( request.term.length > 1 ) {
          response( gSolarSystemNames.filter( el => el.value.toUpperCase().indexOf( request.term.toUpperCase() ) === 0 ));
        } else {
          response( [] );
        }
      }
    });
    $( `#system${index}` ).val( entryWindow.system );
    $( `#startdate${index}` ).datepicker();
    $( `#enddate${index}`   ).datepicker();
    $( `#startdate${index}` ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
    $( `#starttimeH${index}` ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
    $( `#starttimeM${index}` ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
    $( `#enddate${index}`    ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
    $( `#endtimeH${index}`   ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
    $( `#endtimeM${index}`   ).change( event => { updateEntryDataFromUI(); validateEntryDates( event, index ); });
  });
}

function updateEntryDataFromUI() {
  console.log( 'updateEntryDataFromUI' );
  gEntryWindowData.forEach(( entryWindow, index ) => {
    pad_field( `#endtimeH${index}`,   2, '0' );
    pad_field( `#endtimeM${index}`,   2, '0' );
    pad_field( `#starttimeH${index}`, 2, '0' );
    pad_field( `#starttimeM${index}`, 2, '0' );
    entryWindow.system    = $( `#system${index}` ).val();
    entryWindow.startTime = uiGetDateTime( '#start', index );
    entryWindow.endTime   = uiGetDateTime( '#end',   index );
  });
}

function processUrlParameters() {
  const gUrlParams   = parse_url_params( window.location.href );
  gEntryWindowData   = [];

  gLoadUrl = ( 's' in gUrlParams ) && ( 'b' in gUrlParams ) && ( 'e' in gUrlParams );

  if ( gUrlParams[ 's' ] !== undefined ) {
    console.log( "s wasn't undefined" );
    const systemParams = gUrlParams[ 's' ].split( SHARELINK_TOKEN );
    const startParams  = gUrlParams[ 'b' ].split( SHARELINK_TOKEN );
    const endParams    = gUrlParams[ 'e' ].split( SHARELINK_TOKEN );

    systemParams.forEach(( system, index ) => {
      let sysId = system;
      if ( sysId > 10000000 ) sysId = sysId - 30000000;
      const end   = endParams[   Math.min( endParams.length   - 1, index ) ];
      const start = startParams[ Math.min( startParams.length - 1, index ) ];
      const entryWindow = {};
      if ( start < 10000000 ) {
        entryWindow.startTime = parseInt( start ) * MS_PER_MINUTE + EVE_EPOCH;
      } else {
        entryWindow.startTime = parseInt( start ) * MS_PER_SECOND;
      }
      entryWindow.endTime = parseInt( end ) * MS_PER_MINUTE + entryWindow.startTime;
      entryWindow.system  = solarSystemIDtoName( parseInt( sysId ) + SOLAR_SYSTEM_INDEX_OFFSET );
      gEntryWindowData.push( entryWindow );
    });
  } else {
    // old style parameters ( s0, b0, e0, s1, ... )
    for ( let index = 0; ; ++index ) {
      const systemParam = gUrlParams[ `s${index}` ];
      const startParam  = gUrlParams[ `b${index}` ];
      const endParam    = gUrlParams[ `e${index}` ];
      const entryWindow = {};
      let params = 0;

      if ( systemParam !== undefined ) { entryWindow.system = systemParam; ++params; }

      const now = new Date();
      entryWindow.endTime   = now.getTime() * MS_PER_MINUTE;
      entryWindow.startTime = entryWindow.endTime - 90 * MS_PER_MINUTE;

      if ( startParam !== undefined ) {
        entryWindow.startTime = parseInt( startParam ) * MS_PER_MINUTE + EVE_EPOCH;
        ++params;
        if ( endParam !== undefined ) {
          entryWindow.endTime = parseInt( endParam ) * MS_PER_MINUTE + entryWindow.startTime;
          ++params;
        }
      }
      if ( params === 0 ) break;
      gEntryWindowData.push( entryWindow );
    }
  }

  const teamParam = gUrlParams[ 't' ];
  if ( teamParam !== undefined ) {
    for ( let i = 0; i < teamParam.length; ++i ) {
      const value = TEAM_ENCODING.indexOf( teamParam[ i ] );
      gLoadTeams.push( value & 3 );
      gLoadTeams.push(( value >> 2 ) & 3 );
      gLoadTeams.push( value >> 4 );
    }
  }

  const readOpt = ( key, then ) => {
    const p = gUrlParams[ key ];
    if ( p !== undefined ) then( p );
  };

  readOpt( 'o',  p => { if ( p == 1 ) gOptIgnoreInsig          = false; });
  readOpt( 'f',  p => { if ( p == 1 ) gOptEstimateFighterValues = false; });
  readOpt( 'r',  p => { if ( p == 1 ) gOptGotoReplay           = true;  });
  readOpt( 'rs', p => { if ( p == 1 ) gAnimationScale           = false; });
  readOpt( 'ro', p => { if ( p >  0 ) gAnimationOffset          = Number( p ); });
  readOpt( 'rt', p => { if ( p == 1 ) gAnimationSort            = true;  });
  readOpt( 'rd', p => { if ( p >  0 ) gAnimationSpeed           = Number( p ); });
  readOpt( 'rk', p => { if ( p == 1 ) gShowKillsOnly            = true;  });
  readOpt( 'rl', p => { if ( p == 1 ) gAnimationLabel           = false; });
  readOpt( 'rg', p => { if ( p == 1 ) gAnimationGroup           = 'Type'; });
  readOpt( 'rn', p => { if ( p == 1 ) gAnimationGroup           = 'None'; });
}

function createEntryTableButton( text, callback, tooltip ) {
  return `<span class="ux-button Gray" title="${tooltip}" onclick="${callback}">${text}</span>`;
}

function createDateInput( id ) {
  return `<input type="text" maxlength="12" class="ui-state-default ux-entryDate" onkeypress="keyPressed(event);" id="${id}"/>`;
}

function createTimeInput( id, max, text ) {
  return `<input type="number" size="2" maxlength="2" min="0" max="${max}" class="ui-state-default ux-entryTime" onkeypress="keyPressed(event);" id="${id}">${text}</input>`;
}

function createEntryTableRow( index ) {
  const isLast   = index === gEntryWindowData.length - 1;
  const isFirst  = index === 0;
  const cells = [
    TableData( 'ux-shrink', `<label for="system${index}">System/Link: </label>` ),
    TableData( 'ux-expand', `<input id="system${index}" class="ui-state-default ux-entrySystem" placeholder="Enter a solar system or paste an Eve-Kill link" onkeypress="keyPressed(event);"/>` ),
    TableData( 'ux-shrink', 'StartDate:' ),
    TableData( 'ux-shrink', createDateInput( `startdate${index}` )),
    TableData( 'ux-shrink', createTimeInput( `starttimeH${index}`, 23, 'H' )),
    TableData( 'ux-shrink', createTimeInput( `starttimeM${index}`, 59, 'M' )),
    TableData( 'ux-shrink', 'EndDate:' ),
    TableData( 'ux-shrink', createDateInput( `enddate${index}` )),
    TableData( 'ux-shrink', createTimeInput( `endtimeH${index}`, 23, 'H' )),
    TableData( 'ux-shrink', createTimeInput( `endtimeM${index}`, 59, 'M' )),
    TableData( 'ux-shrink', gEntryWindowData.length !== 1 ? createEntryTableButton( '-', `removeEntry(${index})`, 'Remove this entry' ) : '' ),
    TableData( 'ux-shrink', isLast  ? createEntryTableButton( '+', 'addEntry()', 'Add system/timespan entry line' ) : '' ),
    TableData( 'ux-shrink', isFirst ? createEntryTableButton( 'Analyze', 'load_data_click()', 'Start processing' )  : '' )
  ];
  return TableRow( '', cells.join( '' ));
}

function keyPressed( event ) {
  if ( event === undefined && window.event ) event = window.event;
  if ( event.which === 13 || event.keyCode === 13 ) load_data_click();
}

function addEntry() {
  updateEntryDataFromUI();
  const lastEntry = gEntryWindowData[ gEntryWindowData.length - 1 ];
  gEntryWindowData.push({
    system:    '',
    startTime: lastEntry.startTime,
    endTime:   lastEntry.endTime
  });
  generateEntryUIFromData();
}

function removeEntry( index ) {
  updateEntryDataFromUI();
  gEntryWindowData.splice( index, 1 );
  generateEntryUIFromData();
  init();
  refresh();
}

function validateEntryDates( event, index ) {
  if ( !gValidateFlag ) {
    gValidateFlag = true;
    let startTime = uiGetDateTime( '#start', index );
    let endTime   = uiGetDateTime( '#end',   index );
    if ( endTime - startTime < 0 || endTime - startTime > 48 * 60 * MS_PER_MINUTE ) {
      if ( event.target.id.indexOf( 'tart' ) > 0 ) {
        endTime = startTime + 90 * MS_PER_MINUTE;
        uiSetDateTime( endTime, '#end', index );
      } else {
        startTime = endTime - 90 * MS_PER_MINUTE;
        uiSetDateTime( startTime, '#start', index );
      }
    }
    gValidateFlag = false;
  }
}
