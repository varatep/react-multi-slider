import React, {PropTypes, Component} from 'react';

import pureRender from 'pure-render-decorator';

import propTypes from './propTypes';
import Handle from './Handle';

@pureRender
class Handles extends Component {

  static propTypes = {
    index: PropTypes.number,
    zIndices: PropTypes.arrayOf(PropTypes.number),

    value: propTypes.value,
    min: propTypes.min,
    max: propTypes.max,
    handleClassName: propTypes.handleClassName,
    handleActiveClassName: propTypes.handleActiveClassName,
  }

  render() {
    return (
      <span>
        {this._renderHandles()}
      </span>
    );
  }

  _renderHandles = () => {
    const {value, children} = this.props;

    if (React.Children.count(children) > 0) {
      return React.Children.map(children, (child, i) => this._renderHandle(child, value[i], i));
    }

    return value.map((v, i) => this._renderHandle(null, v, i));
  }

  _renderHandle = (child, v, i) => {
    const {index, handleClassName, handleActiveClassName, zIndices, min, max} = this.props;

    return (
      <Handle
        key={`handle-${i}`}
        v={v}
        i={i}
        index={index}
        zIndex={zIndices.indexOf(i)}
        min={min}
        max={max}
        handleClassName={handleClassName}
        handleActiveClassName={handleActiveClassName}
        >
        {child}
      </Handle>
    );
  }
}

export default Handles;
