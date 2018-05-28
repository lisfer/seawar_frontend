import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


class Cell extends React.Component {
    render () {
        return (
            <div className="cell">&nbsp;</div>
        )
    }
}

class SeaField extends React.Component {
    render () {
        let self = this;
        let rows = [];

        for (let i = 0; i < self.props.max_y; i++) {
            let cells = [];
            for (let j = 0; j < self.props.max_x; j++) {
                cells[j] = <Cell x={j} y={i}/>
            }
            rows[i] = <div>{cells}</div>;
        }

        return (
            <div>
                {rows}
            </div>
        )
    }
}


ReactDOM.render(
  <SeaField max_x={10} max_y={10}/>,
  document.getElementById('root')
);
