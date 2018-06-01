import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


const SEA = {EMPTY: 'empty', SHIP: 'ship', BORDER: 'border', MISS: 'miss', HIT: 'hit'};
const SIGNALS = {MISS: 'miss', HIT: 'hit', KILLED:5, WIN:5};
const SERVER = 'http://localhost:5000';

let preparePostData = (data) => {
    let form = new FormData();
    for (let k in data) {
        form.append(k, data[k]);
    }
    return form;
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
            maxY: null
        };
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

    updateCoordinates(coords, value) {
        /*
            @param coords: list of two-values lists: [ [x, y], ...]
            @param value:
         */
        let stateCells = this.state.cells;
        coords.map((el) => {
            stateCells[el[1]][el[0]].value = value;
        });
        this.setState({cells: stateCells});
    }

    set(x, y, value) {
        let stateCells = this.state.cells;
        stateCells[y][x].value = value;
        this.setState({cells: stateCells});
    }

    createField (maxX, maxY) {
        this.setState({
            maxX: maxX,
            maxY: maxY,
            cells: this.createMatrix(maxX, maxY)
        })
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
            <div className ="seaField">{cells}</div>
        )
    }
}


class SeaFieldUser extends SeaField {

    initField() {
        let self = this;
        fetch(SERVER + '/api/init_user_ship', {method: 'POST', credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()})
            .then(
                (data) => {
                    self.createField(data.max_x, data.max_y);
                    self.updateCoordinates(data.ships, SEA.SHIP);
                })
            .catch((err) => console.log(err));
    }
}


class SeaFieldComp extends SeaField {

    constructor(props) {
        super(props);
        this.state['blockClicks'] = false;
    }

    initField() {
        fetch(SERVER + '/api/init_enemy_ship', {method: 'POST', credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()})
            .then(
                (data) => this.createField(data.max_x, data.max_y))
            .catch((err) => console.log(err));
    }

    cellClick(x, y) {
        let self = this;
        if (self.state.blockClicks) return;
        fetch(SERVER + '/api/user_shoot', {method: 'POST', body: preparePostData({'x': x, 'y': y}), credentials: 'include'})
            .then(
                (resp) => {
                    if (!resp.ok) throw Error(resp.statusText);
                    return resp.json()
                })
            .then(
                (data) => {
                    console.log(data, data.signal);
                    self.set(data.x, data.y, (data.signal === SIGNALS.MISS ? SEA.MISS: SEA.HIT));
                    if (data.cells) self.updateCoordinates(data.cells, SEA.SHIP);
                    if (data.border) self.updateCoordinates(data.border, SEA.BORDER);
                })
            .catch((err) => console.log(err))
            .finally(() => self.setState({blockClicks: false}));

        self.setState({blockClicks: true});
    }

    renderCells () {
        return this.state.cells.map(
            (row, y) => (
                <div key={y}>
                    {row.map(
                        (el, x) => <Cell key={`${y}_${x}`} clickHandler={() => this.cellClick(x, y)}
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
