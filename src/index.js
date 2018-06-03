import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Observer from "./observer";


const SEA = {EMPTY: 'empty', SHIP: 'ship', BORDER: 'border', MISS: 'miss', HIT: 'hit'};
const SIGNALS = {MISS: 'miss', HIT: 'hit', KILLED: 'killed', WIN: 'win'};
const GAME_RESULT = {ALIVE: 'alive', DEFEAT: 'defeated'};
const SERVER = 'http://localhost:5000';


const observer = new Observer();
window.observer = observer;


let preparePostData = (data) => {
    let form = new FormData();
    for (let k in data) {
        form.append(k, data[k]);
    }
    return form;
};

let post = (url, handler, final_handler) => {
    /*
    synchronous post request
     */
    let request = new XMLHttpRequest();
    request.open('POST', url, false);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            let data = JSON.parse(request.responseText);
            handler(data);
        } else {
            console.warn('connection error:', request.responseText);
        }
        if (final_handler) final_handler();
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
        };
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

    renderTopCaptions () {
        let letters = '';
        if (this.state.cells.length) {
            letters = this.state.cells[0].map(
                (cell, i) => (<div key={i} className="fieldLetters">{'abcdefghik'[i]}</div>));
        }
        return letters;
    }

    renderLeftCations () {
        let numbers = '';
        if (this.state.cells.length) {
            numbers = this.state.cells.map(
                (cell, i) => (<div key={i} className="fieldNumbers">{i}</div>));
        }
        return numbers;
    }

    render () {

        let cells = this.renderCells();

        return (
            <div className={"seaFieldSurrounder " +  this.state.gameFinishedClassName}>
                <div className="fieldNumbersBlock">{this.renderLeftCations()}</div>
                <div className ="seaField">
                    <div>{this.renderTopCaptions()}</div>
                    {cells}
                </div>
            </div>
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
        this.set(data.x, data.y, (data.value === true ? SEA.HIT : SEA.MISS));
        if (data.border) this.updateCoordinates(data.border, SEA.BORDER);
    }

    gameFinished(data={}) {
        console.log('user', data);
        this.setState({
            gameFinishedClassName: data.is_alive ? GAME_RESULT.ALIVE: GAME_RESULT.DEFEAT
        });
    }
}


class SeaFieldComp extends SeaField {

    initField() {
        post(SERVER + '/api/init_enemy_ship', (data) => {
            this.createField(data.max_x, data.max_y);
        })
    }

    gameFinished(is_alive=false) {
        console.log('com', is_alive);
        this.blockClicks = true;
        this.setState({
            gameFinishedClassName: is_alive ? GAME_RESULT.ALIVE: GAME_RESULT.DEFEAT
        });
        observer.trigger('GAME_FINISHED', {is_alive: !is_alive});
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
                    logMessage(`shoots to (${data.x}, ${data.y})  => ${data.signal}`, {subject: 'User'});

                    self.set(data.x, data.y, (data.signal === SIGNALS.MISS ? SEA.MISS: SEA.HIT));
                    if (data.cells) self.updateCoordinates(data.cells, SEA.SHIP);
                    if (data.border) self.updateCoordinates(data.border, SEA.BORDER);
                    if (data.signal === SIGNALS.MISS) {
                        this.computerShoot();
                    }
                    if (data.signal === SIGNALS.WIN) {
                        this.gameFinished(false);
                    } else {
                        self.blockClicks = false;
                    }
                })
            .catch((err) => {
                self.blockClicks = false;
                console.log(err)
            });

        self.blockClicks = true;
    }

    computerShoot () {
        fetch(SERVER + '/api/computer_shoot', {method: 'POST', credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()
                })
            .then(
                (data) => {
                    logMessage(`shoots to (${data.x}, ${data.y})  => ${data.signal}`, {subject: 'Computer'});
                    observer.trigger(
                        'SHOOT_TO_USER',
                        {border: data.border, x: data.x, y: data.y, value: Boolean(data.signal !== SIGNALS.MISS)});
                    if (data.signal === SIGNALS.WIN) {
                        this.gameFinished(true);
                    } else if (data.signal !== SIGNALS.MISS) this.computerShoot();
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


function logMessage(text, data={}) {
    data.text = text;
    observer.trigger('ADD_MESSAGE', data);
}

class LoggerLine extends React.Component {

    componentDidMount() {
        var current = ReactDOM.findDOMNode(this);
        current.scrollIntoView();
        // set el height and width etc.
    }

    render() {
        return (
            <div className="loggerLine">
                <span className="time">{this.props.msg_time}</span>
                <span className="subject">{this.props.msg_subject}</span>
                <span className="text">{this.props.msg_text}</span>
            </div>
        )
    }
}

class Logger extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            messages: []
        };
        observer.add('ADD_MESSAGE', this.addMessage.bind(this));
    }

    addMessage(data) {
        let msg = this.state.messages;
        let msg_line = {
            time: new Date().toLocaleTimeString(),
            text: data.text,
            subject: data.subject,
        };
        msg.push(msg_line);
        this.setState({
            messages: msg
        })
    }

    renderMessages() {
        return this.state.messages.map(
            (line, i) => (<LoggerLine key={i} msg_time={line.time} msg_subject={line.subject}
                                      msg_text={line.text} />));
    }

    render () {
        return (
            <div className = "logger" >
                    -- logger --
                {this.renderMessages()}
            </div>
        )
    }
}

ReactDOM.render(
    <div>
        <SeaFieldUser max_x={10} max_y={10}/>
        <SeaFieldComp max_x={10} max_y={10}/>
        <Logger />
    </div>,
  document.getElementById('root')
);
