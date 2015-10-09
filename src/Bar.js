import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

class Bar extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  static contextTypes = {
    _posMinKey: PropTypes.func,
    _posMaxKey: PropTypes.func,
  }

  render() {
    const {valueFrom, valueTo, i, barClassName, min, max} = this.props;

    // console.log(`Render bar ${i}`);

    const className = `${barClassName} ${barClassName}-${i}`;
    const style = this._buildBarStyle(valueFrom + min, max - valueTo);

    return (
      <div
        className={className}
        style={style}
        />
    );
  }

    // TODO: rename valueFrom, valueTo
  _buildBarStyle = (valueFrom, valueTo) => {
    const {min, max, active} = this.props;
    const {_posMinKey, _posMaxKey} = this.context;

    const posMinKey = _posMinKey();
    const posMaxKey = _posMaxKey();

    const posMin = valueFrom / (max - min) * 100;
    const posMax = valueTo / (max - min) * 100;

    return {
      position: 'absolute',
      willChange: active ? `${posMinKey}, ${posMaxKey}` : '',
      [posMinKey]: `${posMin}%`,
      [posMaxKey]: `${posMax}%`,
    };
  }
}

export default Bar;
