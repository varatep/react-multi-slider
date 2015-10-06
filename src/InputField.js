import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

// import propTypes from './propTypes';

class InputField extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  static contextTypes = {
    _onFocus: PropTypes.func,
    _move: PropTypes.func,
    _onBlur: PropTypes.func,
  }

  render() {
    const {v, i, name, disabled, inputFieldClassName} = this.props;
    const {_onFocus, _move, _onBlur} = this.context;

    return (
      <input
        key={i}
        type="number"
        name={name}
        className={inputFieldClassName}
        defaultValue={v}
        onFocus={() => _onFocus(i)}
        onChange={e => _move(e.target.value)}
        onBlur={_onBlur}
        disabled={disabled}
        />
    );
  }
}

export default InputField;
