import React, {Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

import Handle from './Handle.js';

class Handles extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

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
    const {handleClassName, handleActiveClassName, activeHandles, zIndices, min, max, disabled} = this.props;

    return (
      <Handle
        key={`handle-${i}`}
        value={v}
        index={i}
        active={activeHandles[i]}
        zIndex={zIndices.indexOf(i)}
        min={min}
        max={max}
        handleClassName={handleClassName}
        handleActiveClassName={handleActiveClassName}
        disabled={disabled}
        >
        {child}
      </Handle>
    );
  }
}

export default Handles;
