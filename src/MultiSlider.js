import React, {PropTypes, Component} from 'react';

import {linspace, ensureArray, undoEnsureArray} from './common';
import {propTypes, defaultProps} from './props.js';

import Handles from './Handles.js';
import Bars from './Bars.js';
import InputFields from './InputFields.js';

const LEFT_KEY = 37;
const UP_KEY = 38;
const RIGHT_KEY = 39;
const DOWN_KEY = 40;

// FIXME: split into multiple files? manage state outside of component?
class MultiSlider extends Component {

  static propTypes = propTypes
  static defaultProps = defaultProps

  static childContextTypes = {
    invert: PropTypes.bool,
    step: PropTypes.number,

    _onFocus: PropTypes.func,
    _onBlur: PropTypes.func,
    _onKeyDown: PropTypes.func,

    _start: PropTypes.func,
    _move: PropTypes.func,
    _end: PropTypes.func,

    _measureSliderLength: PropTypes.func,

    _posMinKey: PropTypes.func,
    _posMaxKey: PropTypes.func,
    _incKey: PropTypes.func,
    _decKey: PropTypes.func,

    _getPosition: PropTypes.func,
  }

  getChildContext() {
    const {invert, step} = this.props;

    return {
      invert,
      step,

      // state management
      _start: this._start,
      _move: this._move,
      _end: this._end,

      // measurement methods
      _measureSliderLength: this._measureSliderLength,

      // orientation methods
      _posMinKey: this._posMinKey,
      _posMaxKey: this._posMaxKey,
      _incKey: this._incKey,
      _decKey: this._decKey,

      _getPosition: this._getPosition,
    };
  }

  _getInitialState = () => {
    const {value, defaultValue} = this.props;

    const orValue = this._or(ensureArray(value), ensureArray(defaultValue));
    const trimmedValue = orValue.map(v => this._trimAlignValue(v, this.props));
    const zIndices = orValue.map((_, i) => i);

    return {
      zIndices,
      value: trimmedValue,
      activeHandles: {},
    };
  }

  constructor(props) {
    super(props);
    this.state = this._getInitialState();
  }

  // Keep the internal `value` consistent with an outside `value` if present.
  // This basically allows the slider to be a controlled component.
  // FIXME: turn into proper controlled component (do nothing unless value prop changes)
  componentWillReceiveProps(newProps) {
    const {value} = this.state;

    const orValue = this._or(ensureArray(newProps.value), value);
    const trimmedValue = orValue.map(v => this._trimAlignValue(v, newProps));

    this.setState({value: trimmedValue});
  }

  // Check if the arity of `value` or `defaultValue` matches the number of children (= number of custom handles).
  // If no custom handles are provided, just returns `value` if present and `defaultValue` otherwise.
  // If custom handles are present but neither `value` nor `defaultValue` are applicable the handles are spread out
  // equally.
  // TODO: better name? better solution? --> turning this into a "true"  controlled component should remove the need for this
  _or = (value, defaultValue) => {
    const {children, min, max} = this.props;

    const count = React.Children.count(children);

    switch (count) {
      case 0:
        return value.length > 0 ? value : defaultValue;
      case value.length:
        return value;
      case defaultValue.length:
        return defaultValue;
      default:
        return linspace(min, max, count);
    }
  }

  getValue() {
    const {value} = this.state;
    return undoEnsureArray(value);
  }

  // calculates the offset of a handle in pixels based on its value.
  _calcOffset = (value) => {
    const {sliderLength} = this;
    const {min, max} = this.props;

    const ratio = (value - min) / (max - min);
    return ratio * sliderLength;
  }

  // calculates the value corresponding to a given pixel offset, i.e. the inverse of `_calcOffset`.
  _calcValue = (offset) => {
    const {sliderLength} = this;
    const {min, max} = this.props;

    const ratio = offset / sliderLength;
    return ratio * (max - min) + min;
  }

  _getClosestIndex = (clickOffset) => {
    const {value} = this.state;

    let minDist = Number.MAX_VALUE;
    let closestIndex = -1;

    for (let [i, v] of value.entries()) {
      const offset = this._calcOffset(v);
      const dist = Math.abs(clickOffset - offset);

      if (dist <= minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  _calcOffsetFromPosition = (position) => {
    const {sliderStart} = this;
    return Math.abs(position - sliderStart);
  }

  _calcValueFromPosition = (position) => {
    const {minDistance} = this.props;

    const clickOffset = this._calcOffsetFromPosition(position);
    const nextValue = this._trimAlignValue(this._calcValue(clickOffset));

    const value = [...this.state.value]; // Clone this.state.value since we'll modify it temporarily

    const closestIndex = this._getClosestIndex(clickOffset);
    value[closestIndex] = nextValue;

    // Prevents the slider from shrinking below `props.minDistance`
    // FIXME: Isn't this implemented already?
    for (let [i] of value.entries()) {
      if (value[i + 1] - value[i] < minDistance) return [value, -1];
    }

    return [value, closestIndex];
  }

  // FIXME: take correct measurements when component is transformed via CSS
  _measureSliderLength = () => {
    const {slider} = this.refs;

    const sizeKey = this._sizeKey();
    const directionKey = this._directionKey();

    const sliderNode = slider.getDOMNode();

    const sliderMin = sliderNode[`offset${directionKey}`] + sliderNode[`client${directionKey}`];
    const sliderMax = sliderMin + sliderNode[sizeKey];

    return Math.abs(sliderMax - sliderMin);
  }

  _start = (index) => {
    const {activeHandles, zIndices} = this.state;

    this._hasMoved = false;

    zIndices.splice(zIndices.indexOf(index), 1); // remove wherever the element is
    zIndices.push(index); // add to end

    activeHandles[index] = true;

    this._fireChangeEvent('onBeforeChange');

    this.setState({
      activeHandles,
      zIndices: [...zIndices],
    });
  }

  _move = (index, toValue) => {
    const {min, max, minDistance, pearling, disabled} = this.props;
    const {value} = this.state;

    this._hasMoved = true;

    // TODO: remove, ensure _move is not called when slider is disabled
    // The reason is that event handlers can have other effect as well and therefore need to be disabled anyway,
    // so checking here again is probably redundant.
    if (disabled) return;

    const {length} = value;
    const oldValue = value[index];

    let newValue = this._trimAlignValue(toValue);

    // if "pearling" (= handles pushing each other) is disabled,
    // prevent the handle from getting closer than `minDistance` to the previous or next handle.
    if (!pearling) {
      if (index > 0) {
        const valueBefore = value[index - 1];
        if (newValue < valueBefore + minDistance) {
          newValue = valueBefore + minDistance;
        }
      }

      if (index < length - 1) {
        const valueAfter = value[index + 1];
        if (newValue > valueAfter - minDistance) {
          newValue = valueAfter - minDistance;
        }
      }
    }

    value[index] = newValue;

    // if "pearling" is enabled, let the current handle push the pre- and succeeding handles.
    if (pearling && length > 1) {
      if (newValue > oldValue) {
        this._pushSucceeding(value, minDistance, index);
        this._trimSucceeding(length, value, minDistance, max);
      } else if (newValue < oldValue) {
        this._pushPreceding(value, minDistance, index);
        this._trimPreceding(length, value, minDistance, min);
      }
    }

    // Normally you would use `shouldComponentUpdate`, but since the slider is a low-level component,
    // the extra complexity might be worth the extra performance.
    if (newValue !== oldValue) {
      // FIXME: better solution around pure render than copying the array?
      this.setState({value: [...value]}, () => this._fireChangeEvent('onChange'));
    }
  }

  _pushSucceeding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] + minDistance;
         value[i + 1] && padding > value[i + 1];
         i++, padding = value[i] + minDistance) {
      value[i + 1] = this._alignValue(padding);
    }
  }

  _trimSucceeding = (length, nextValue, minDistance, max) => {
    for (let i = 0; i < length; i++) {
      let padding = max - i * minDistance;
      if (nextValue[length - 1 - i] > padding) {
        nextValue[length - 1 - i] = padding;
      }
    }
  }

  _pushPreceding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] - minDistance;
         value[i - 1] && padding < value[i - 1];
         i--, padding = value[i] - minDistance) {
      value[i - 1] = this._alignValue(padding);
    }
  }

  _trimPreceding = (length, nextValue, minDistance, min) => {
    for (let i = 0; i < length; i++) {
      let padding = min + i * minDistance;
      if (nextValue[i] < padding) {
        nextValue[i] = padding;
      }
    }
  }

  _end = (index) => {
    const {activeHandles} = this.state;

    this._hasMoved = false;
    this._fireChangeEvent('onAfterChange');

    delete activeHandles[index];

    this.setState({
      activeHandles: {...activeHandles},
    });
  }

  _axisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'X';
    if (orientation === 'vertical') return 'Y';
  }

  _orthogonalAxisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'Y';
    if (orientation === 'vertical') return 'X';
  }

  _posMinKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'right' : 'left';
    if (orientation === 'vertical') return invert ? 'bottom' : 'top';
  }

  _posMaxKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'left' : 'right';
    if (orientation === 'vertical') return invert ? 'top' : 'bottom';
  }

  _sizeKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'clientWidth';
    if (orientation === 'vertical') return 'clientHeight';
  }

  _directionKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'Left';
    if (orientation === 'vertical') return 'Top';
  }

  _incKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? LEFT_KEY : RIGHT_KEY;
    if (orientation === 'vertical') return invert ? UP_KEY : DOWN_KEY;
  }

  _decKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? RIGHT_KEY : LEFT_KEY;
    if (orientation === 'vertical') return invert ? DOWN_KEY : UP_KEY;
  }

  _trimAlignValue = (val, props) => {
    return this._alignValue(this._trimValue(val, props), props);
  }

  _trimValue = (val, props) => {
    const {min, max} = props || this.props;

    if (val <= min) return min;
    if (val >= max) return max;

    return val;
  }

  // FIXME: new implementation?
  _alignValue = (val, props) => {
    const {min, step} = props || this.props;

    const valModStep = (val - min) % step;

    let alignValue = val - valModStep;
    if (Math.abs(valModStep) * 2 >= step) {
      alignValue += valModStep > 0 ? step : -step;
    }

    return parseFloat(alignValue.toFixed(5));
  }

  _renderHandles = () => {
    const {min, max, handleClassName, handleActiveClassName, disabled, children} = this.props;
    const {value, activeHandles, zIndices} = this.state;

    return (
      <Handles
        value={value}
        activeHandles={activeHandles}
        zIndices={zIndices}
        min={min}
        max={max}
        handleClassName={handleClassName}
        handleActiveClassName={handleActiveClassName}
        disabled={disabled}
        >
        {children}
      </Handles>
    );
  }

  _renderBars = () => {
    const {min, max, barClassName} = this.props;
    const {value} = this.state;

    return (
      <Bars
        value={value}
        min={min}
        max={max}
        barClassName={barClassName}
        />
    );
  }

  _renderInputFields = () => {
    const {name, disabled, inputFieldClassName} = this.props;
    const {value} = this.state;

    return (
      <InputFields
        value={value}
        name={name}
        disabled={disabled}
        inputFieldClassName={inputFieldClassName}
        />
    );
  }

  /*
  _onSliderMouseDown = (e) => {
    const {snapDragDisabled} = this.props;

    this._hasMoved = false;

    if (!snapDragDisabled) {
      this._takeMeasurements();

      const [position] = this._getMousePosition(e);
      const [value, closestIndex] = this._calcValueFromPosition(position);

      if (closestIndex >= 0) {
        this.setState({value}, () => {
          this._fireChangeEvent('onChange');
          this._onStart(closestIndex, position);
          this._addHandlers(this._getMouseEventMap());
        });
      }
    }

    pauseEvent(e);
  }
  */

  _onSliderMouseUp = (e) => {
    const {onSliderClick} = this.props;

    if (onSliderClick && !this._hasMoved) {
      // TODO: measure slider
      //this._takeMeasurements();

      const [position] = this._getPosition(e);
      const valueAtPos = this._trimAlignValue(this._calcValue(this._calcOffsetFromPosition(position)));

      onSliderClick(valueAtPos);
    }
  }

  _fireChangeEvent = (eventType) => {
    const {value} = this.state;
    const callback = this.props[eventType];

    if (callback) {
      callback(undoEnsureArray(value));
    }
  }

  // FIXME: just return (x, y), change other code
  _getPosition= (e) => {
    return [
      e[`page${this._axisKey()}`],
      e[`page${this._orthogonalAxisKey()}`],
    ];
  }

  render() {
    const {className, style, disabled, withBars, withoutInputFields} = this.props;

    const newClassName = className + (disabled ? ' disabled' : '');
    const newStyle = {...style, position: 'relative'};

    const bars = withBars ? this._renderBars() : null;
    const handles = this._renderHandles();
    const inputFields = withoutInputFields ? null : this._renderInputFields();

    return (
      <div>
        <div
          ref="slider"
          className={newClassName}
          style={newStyle}
          onMouseDown={null/*disabled ? null : this._onSliderMouseDown*/}
          onMouseUp={null/*disabled ? null : this._onSliderMouseUp*/}
          >
          {bars}
          {handles}
        </div>
        {inputFields}
      </div>
    );
  }
}

export default MultiSlider;
