import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Observer from "./observer";


const SEA = {EMPTY: 'empty', SHIP: 'ship', BORDER: 'border', MISS: 'miss', HIT: 'hit'};
const SIGNALS = {MISS: 'miss', HIT: 'hit', KILLED: 'killed', WIN: 'win'};
const GAME_RESULT = {WINNER: 'winner', LOSER: 'looser'};
const SERVER = 'http://localhost:5000';


var observer = new Observer();
window.observer = observer;


let preparePostData = (data) => {
    let form = new FormData();
    for (let k in data) {
        form.append(k, data[k]);
    }
    return form;
};

let post = (url, handler, final_hander) => {
    /*
    synchronous post request
     */
    var request = new XMLHttpRequest();
    request.open('POST', url, false);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var data = JSON.parse(request.responseText);
            handler(data);
        } else {
            console.warn('connection error:', request.responseText);
        }
        if (final_hander) final_hander();
    };
    request.onerror = function() {
      console.warn('connection error:', request.responseText);
    };
    request.withCredentials = true;
    request.send();
};

class Cell extends React.Component {

    render () {

        let className = 'cell';
        if (this.props.value === SEA.SHIP) className += ' cellShipUser';
        if (this.props.value === SEA.BORDER) className += ' cellBorder';
        if (this.props.value === SEA.MISS) className += ' cellMissed';
        if (this.props.value === SEA.HIT) className += ' cellHit';
        return (
            <div className={className} onClick={this.props.clickHandler}>&nbsp;</div>
        )
    }
}

class SeaField extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            cells: [],
            maxX: null,
            maxY: null,
            gameFinishedClassName: ''
        };
    }

    componentDidMount() {
       this.initField();
    }

    initField() {}

    createMatrix(maxX, maxY) {
        /*
        creates Array [maxY][maxY]
        where every element is a Object{x, y, is_ship, is_border} keys
         */
        return Array.from({length: maxY}, (v, i) => Array.from(
            {length: maxX},
            (v, j) => ({x: j, y: i, value: SEA.EMPTY})));
    }

    updateCoordinates(coords, value, stateCells=this.state.cells) {
        /*
            @param coords: list of two-values lists: [ [x, y], ...]
            @param value:
         */
        coords
            .filter(
                (el) => (stateCells[el[1]][el[0]].value === SEA.EMPTY))
            .map(
                (el) => (stateCells[el[1]][el[0]].value = value));
        this.setState({cells: stateCells});
    }

    set(x, y, value) {
        let stateCells = this.state.cells;
        stateCells[y][x].value = value;
        this.setState({cells: stateCells});
    }

    createField (maxX, maxY) {
        let data = {
            maxX: maxX,
            maxY: maxY,
            cells: this.createMatrix(maxX, maxY)
        }
        this.setState(data);
        return data;
    }

    renderCells () {
        return this.state.cells.map(
            (row, y) => (
                <div key={y}>
                    {row.map((el, x) => <Cell key={`${y}_${x}`} x={x} y={y} value={el.value}/>)}
                </div>));
    }

    render () {

        let cells = this.renderCells();

        return (
            <div className ={'seaField ' + this.state.gameFinishedClassName}>{cells}</div>
        )
    }
}


class SeaFieldUser extends SeaField {

    constructor(props) {
        super(props);
        observer.add('SHOOT_TO_USER', this.incomeShoot.bind(this));
        observer.add('GAME_FINISHED', this.gameFinished.bind(this));
    }

    initField() {
        let self = this;
        post(SERVER + '/api/init_user_ship', (data) => {
            self.updateCoordinates(data.ships, SEA.SHIP, self.createField(data.max_x, data.max_y).cells);
        })
    }

    incomeShoot(data) {
        this.set(data.x, data.y, (data.value == true ? SEA.HIT : SEA.MISS));
        if (data.border) this.updateCoordinates(data.border, SEA.BORDER);
    }

    gameFinished(is_winner=false) {
        this.setState({
            gameFinishedClassName: is_winner ? GAME_RESULT.WINNER: GAME_RESULT.LOSER
        });
    }
}


class SeaFieldComp extends SeaField {

    initField() {
        post(SERVER + '/api/init_enemy_ship', (data) => {
            this.createField(data.max_x, data.max_y);
        })
    }

    gameFinished(is_winner=false) {
        this.blockClicks = true;
        this.setState({
            gameFinishedClassName: is_winner ? GAME_RESULT.WINNER: GAME_RESULT.LOSER
        });
        observer.trigger('GAME_FINISHED', {is_winner: !is_winner});
    }

    cellClick(x, y) {
        let self = this;
        if (self.blockClicks) return;

        fetch(SERVER + '/api/user_shoot', {method: 'POST', body: preparePostData({'x': x, 'y': y}), credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()
                })
            .then(
                (data) => {
                    console.log('user shoot', data);
                    self.set(data.x, data.y, (data.signal === SIGNALS.MISS ? SEA.MISS: SEA.HIT));
                    if (data.cells) self.updateCoordinates(data.cells, SEA.SHIP);
                    if (data.border) self.updateCoordinates(data.border, SEA.BORDER);
                    if (data.signal == SIGNALS.MISS) {
                        this.computerShoot();
                    }
                    if (data.signal == SIGNALS.WIN) {
                        this.gameFinished(false);
                    } else {
                        self.blockClicks = false;
                    }
                })
            .catch((err) => {
                self.blockClicks = false;
                console.log(err)
            })

        self.blockClicks = true;
    }

    computerShoot () {
        let self = this;

        fetch(SERVER + '/api/computer_shoot', {method: 'POST', credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()
                })
            .then(
                (data) => {
                    console.log('comp shoot', data);
                    observer.trigger(
                        'SHOOT_TO_USER',
                        {border: data.border, x: data.x, y: data.y, value: Boolean(data.signal !== SIGNALS.MISS)})
                    if (data.signal == SIGNALS.WIN) {
                        this.gameFinished(false);
                    } else if (data.signal != SIGNALS.MISS) this.computerShoot();
                })
            .catch((err) => console.log(err))
    }

    renderCells () {
        return this.state.cells.map(
            (row, y) => (
                <div key={y}>
                    {row.map(
                        (el, x) => <Cell key={`${y}_${x}`} clickHandler={el.value === SEA.EMPTY ? () => this.cellClick(x, y) : null}
                                         x={x} y={y} value={el.value}/>)}
                </div>));
    }
}

ReactDOM.render(
    <div>
        <SeaFieldUser max_x={10} max_y={10}/>
        <SeaFieldComp max_x={10} max_y={10}/>
    </div>,
  document.getElementById('root')
);
