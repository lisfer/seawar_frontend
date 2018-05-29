import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


const SEA = {EMPTY:0, SHIP:10, BORDER:1};

class Cell extends React.Component {

    render () {

        let className = 'cell';
        if (this.props.value === SEA.SHIP) className += ' shipCellUser';
        if (this.props.value === SEA.BORDER) className += ' borderCell';
        return (
            <div className={className}>&nbsp;</div>
        )
    }
}

class SeaField extends React.Component {

    createMatrix(max_x, max_y) {
        /*
        creates Array [max_y][max_y]
        where every element is a Object{x, y, is_ship, is_border} keys
         */
        return Array.from(
                {length: max_y},
                (v, i) => Array.from(
                    {length: max_x},
                    (v, j) => ({x: j, y: i, value: SEA.EMPTY})));
    }

    initShips() {
        let self = this;
        fetch('http://localhost:5000/init_user_ship', {method: 'POST'})
            .then(
                (response) => response.json())
            .then(
                (data) => self.set_many(data.filter((el) => el.value === SEA.SHIP)))
            .catch(function(error) { console.log(error); });
    }

    set_many(cells_update) {
        let state_cells = this.state.cells;
        cells_update.map((el) => (state_cells[el.y][el.x].value = el.value));
        this.setState({cells: state_cells});
    }

    constructor(props) {
        super(props);
        this.state = {
            max_x: this.props.max_x,
            max_y: this.props.max_y,
            cells: this.createMatrix(this.props.max_x, this.props.max_y)
        };
        this.initShips();
    }

    render () {
        let self = this;

        let cells = self.state.cells.map(
            (row, y) =>  (
                <div key={y}>
                    {row.map((el, x) => { return <Cell key={`${y}_${x}`} x={x} y={y} value={el.value}/>})}
                </div>));

        return (
            <div>{cells}</div>
        )
    }
}


ReactDOM.render(
  <SeaField max_x={10} max_y={10}/>,
  document.getElementById('root')
);
