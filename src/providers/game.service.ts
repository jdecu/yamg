import {Http} from '@angular/http';
import {Injectable} from '@angular/core';
import {Platform} from 'ionic-angular';
import {Observable} from "rxjs/Observable";
import {GameNumbersProvider} from "./game-mumbers";
import {GameGreekLettersProvider} from "./game-greekLetters";
import {GameHebrewLettersProvider} from "./game-hebrewLetters";
import {GameTile, IGame, IGameDataProvider} from "../interfaces/games-intf";
import {GameEgyptianHierosProvider} from "./game-egyptianHieroglyphics";

/* *********************************************************************************************************************
 flip flap game board tile
 */
@Injectable()
export class GameService {

  private static GameStartMsg   = 'Click to Start';
  private static GameLostMsg    = 'Sorry you lost';
  private static GameWinMsg     = 'Great Win';
  public games: Array<IGame>;

  private NbTiles               = 9;
  private UnMatchedPairs        = 0;
  private matches               = 0;
  private moves                 = 0;
  private GameTimer?: number    = undefined;
  public  GameStartTime?: any   = null;
  public  GameCountDown: string = GameService.GameStartMsg;
  public  isOver                = false;

  private PickTimer?: number  = undefined;
  private firstPick?: GameTile  = undefined;
  private secondPick?: GameTile = undefined;

  public selectedItem: IGame;

  public static GameMode_Numbers       = 'Numbers';
  public static GameMode_GreekLetters1 = 'GreekLetters1';
  public static GameMode_GreekLetters2 = 'GreekLetters2';
  public static GameMode_HebrewLetters1= 'HebrewLetters1';
  public static GameMode_HebrewLetters2= 'HebrewLetters2';
  public static GameMode_EgyptianHiero1= 'EgyptianHiero1';
  public static GameMode_EgyptianHiero2= 'EgyptianHiero2';
  public static GameMode_Phone_Numbers = 'Phone Numbers';
  public static GameMode_Contacts      = 'Contacts';


  /* ..................................................................................................................
  * Ionic make me singleton iff
  */
  constructor(private http: Http) {
    // console.log('Hello GameService Provider !');
    this.games = [
        {key: GameService.GameMode_Numbers       , title: 'Random Numbers'                 , icon: 'infinite'  , showHelp:false}
      , {key: GameService.GameMode_GreekLetters1 , title: 'Greek Letters'                  , icon: 'bluetooth' , showHelp:true }
      , {key: GameService.GameMode_GreekLetters2 , title: 'Greek Letters vs Latin Name'    , icon: 'bluetooth' , showHelp:false}
      , {key: GameService.GameMode_HebrewLetters1, title: 'Hebrew Letters'                 , icon: 'wifi'      , showHelp:true }
      , {key: GameService.GameMode_HebrewLetters2, title: 'Hebrew Letters vs Name'         , icon: 'wifi'      , showHelp:false}
      , {key: GameService.GameMode_EgyptianHiero1, title: 'Egyptian Hieroglyph'            , icon: 'plane'     , showHelp:true }
      , {key: GameService.GameMode_EgyptianHiero2, title: 'Egyptian Hieroglyph vc Name'    , icon: 'plane'     , showHelp:false}
      , {key: GameService.GameMode_Phone_Numbers , title: 'Contacts Phone Numbers'         , icon: 'person'    , showHelp:true }
      , {key: GameService.GameMode_Contacts      , title: 'Contacts Phone Numbers vs Image', icon: 'boat'      , showHelp:true }
    ];
    }

  public get tiles$(): Observable<Array<GameTile>> {
    this.resetGame();
    // console.log('Build Tiles:',this.NbTiles);
    let dataProvider : IGameDataProvider = this.getdataProvider();
    return dataProvider.generateData(this.NbTiles);
  }

  public get allTiles$(): Observable<Array<GameTile>> {
    // console.log('Build Tiles:',this.NbTiles);
    let dataProvider : IGameDataProvider = this.getdataProvider();
    return dataProvider.generateAllData();
  }

  /* ..................................................................................................................
  * Prepare tiles according to ...
  */
  public recalcBoard(platform: Platform): boolean {
    // console.log('GameService recalcBoard Platform width:',platform.width(),'height:',platform.height());
    // Must match css board padding : .5px; + board-tile flex: 1 0 79.5px
    let NbCols = Math.floor(platform.width()  / 80.00);
    let NbRows = Math.floor(platform.height() / 80.00);
    if ((NbCols % 2)&&(NbRows % 2)) NbRows++;
    let Nb = NbCols*NbRows;
    if (this.NbTiles === Nb) {
      // console.log('Keep NbRows',NbRows,'NbCols',NbCols,'Tiles',Nb);
      return false;
      }
    // console.log('NbRows',NbRows,'NbCols',NbCols,'Tiles',Nb);
    this.NbTiles = Nb;
    return true;
  }

  /* ..................................................................................................................
  * New Game, Reset counters
  */
  private resetGame(): void {
    // console.log('Reset Game Tiles:',this.NbTiles);
    this.isOver = false;
    this.moves = 0;
    this.matches = 0;
    this.firstPick = undefined;
    this.secondPick = undefined;
    this.UnMatchedPairs = this.NbTiles / 2;

    this.GameCountDown=GameService.GameStartMsg;
    this.GameStartTime=null;
    clearTimeout(this.GameTimer);
    this.GameTimer=undefined;

    clearTimeout(this.PickTimer);
    this.PickTimer=undefined;
    }


  /* ..................................................................................................................
  * shuffle tiles ...
  */
  public getdataProvider(): IGameDataProvider{
    let s = GameService.GameMode_EgyptianHiero1;
    if (this.selectedItem){
      s=this.selectedItem.key || GameService.GameMode_EgyptianHiero1;
      }
    //console.log('getdataProvider',s);
    switch(s) {
      case GameService.GameMode_GreekLetters1:
      case GameService.GameMode_GreekLetters2:
        return new GameGreekLettersProvider(this.http,s);
      case GameService.GameMode_HebrewLetters1:
      case GameService.GameMode_HebrewLetters2:
        return new GameHebrewLettersProvider(this.http,s);
      case GameService.GameMode_EgyptianHiero1:
      case GameService.GameMode_EgyptianHiero2:
        return new GameEgyptianHierosProvider(this.http,s);
      case GameService.GameMode_Numbers:
        return new GameNumbersProvider();
      }
    return new GameNumbersProvider();
    }


  /* ..................................................................................................................
  * Toggle clicked tile ...
  */
  public clickTile(tile: GameTile): void {

    if (!this.GameTimer) {
      this.startGameTimer();
    }

    if (this.secondPick) {
      // console.log('TurnDown previous missmatch');
      let dblClick = (this.firstPick === tile) || (this.secondPick === tile);
      this.firstPick.turnDown();
      this.secondPick.turnDown();
      this.firstPick = undefined;
      this.secondPick = undefined;
      if (dblClick)
        return;
    }

    if (!tile || tile.turnedOn || (this.firstPick === tile) ) {
      // console.log('Double click on firstPick ?');
      return;
    }

    if (!this.firstPick) {
      // console.log('first Pick ! Turn On and Wait for the second pick');
      this.firstPick = tile;
      this.startPickTimeOut();
      tile.turnOn();
      return;
      }

    if (this.firstPick.key != tile.key) {
      // console.log('Second pick is missmatched !');
      this.secondPick = tile;
      this.startPickTimeOut();
      tile.turnOn();
      this.moves++;
      return;
      }

    // console.log('match ! ',this.UnMatchedPairs);
    this.moves++;
    this.matches++;
    this.UnMatchedPairs--;
    this.firstPick.match();
    this.firstPick = undefined;
    this.secondPick = undefined;
    clearTimeout(this.PickTimer);
    this.PickTimer=undefined;
    tile.match();
    if (!this.UnMatchedPairs)
      this.gameWin();
    return
    }

  /* ..................................................................................................................
   * Second Pick TimeOut
   */
  public startPickTimeOut(): void {
    clearTimeout(this.PickTimer);
    this.PickTimer = setTimeout(() => {
      if (this.firstPick) this.firstPick.turnDown();
      if (this.secondPick) this.secondPick.turnDown();
      this.firstPick  = undefined;
      this.secondPick = undefined;
      }, 5000);
    }

  /* ..................................................................................................................
   * Game Win
   */
  public gameWin(): void {
    // console.log('gameWin !');
    clearTimeout(this.GameTimer);
    this.GameCountDown = GameService.GameWinMsg + this.GameCountDown;
    this.GameTimer=undefined;
    this.isOver=true;
    }

  /* ..................................................................................................................
   * Game Win
   */
  public gameOver(): void {
    // console.log('gameOver !');
    clearTimeout(this.GameTimer);
    this.GameCountDown = GameService.GameLostMsg;
    this.GameTimer=undefined;
    this.isOver=true;
    }

  /* ..................................................................................................................
   * Second Pick TimeOut
   */
  public startGameTimer(): void {
    clearTimeout(this.GameTimer);
    this.GameStartTime =  new Date();
    this.GameTimer = setInterval(() => {
      const duration = 5*60;
      const diff = duration - (((Date.now() - this.GameStartTime) / 1000) | 0);
      if (diff<0) {
        this.gameOver();
      } else {
        const minutes = (diff / 60) | 0;
        const seconds = (diff % 60) | 0;
        this.GameCountDown = minutes + ":" + seconds;
      }
    }, 1000);
  }

}
