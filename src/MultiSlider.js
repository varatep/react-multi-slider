import React, {PropTypes, Component} from 'react';

import {pauseEvent, stopPropagation, linspace, ensureArray, undoEnsureArray} from './common';
import propTypes from './propTypes';

import Handles from './Handles';
import Bars from './Bars';
import InputFields from './InputFields';

const LEFT_KEY = 37;
const RIGHT_KEY = 39;

const SHIFT_MULTIPLIER = 10;

// FIXME: split into multiple files? manage state outside of component?
class MultiSlider extends Component {

  static propTypes = propTypes

  static defaultProps = {
    min: 0,
    max: 100,
    step: 1,
    minDistance: 0,
    defaultValue: 0,
    orientation: 'horizontal',
    className: 'slider',
    style: null,
    handleClassName: 'handle',
    handleActiveClassName: 'active',
    barClassName: 'bar',
    withBars: false,
    pearling: false,
    disabled: false,
    snapDragDisabled: false,
    invert: false,
    withoutInputFields: false,
    inputFieldClassName: 'input',
  }

  static childContextTypes = {
    _createOnMouseDown: PropTypes.func,
    _createOnTouchStart: PropTypes.func,
    _onFocus: PropTypes.func,
    _onBlur: PropTypes.func,
    _onKeyDown: PropTypes.func,
    _move: PropTypes.func,

    _posMinKey: PropTypes.func,
    _posMaxKey: PropTypes.func,
  }

  getChildContext() {
    return {
      _createOnMouseDown: this._createOnMouseDown,
      _createOnTouchStart: this._createOnTouchStart,
      _onFocus: this._onFocus,
      _onBlur: this._onBlur,
      _onKeyDown: this._onKeyDown,
      _move: this._move,

      _posMinKey: this._posMinKey,
      _posMaxKey: this._posMaxKey,
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

      // FIXME: allow moving more than one handle at a time
      index: -1,
    };
  }

  constructor(props) {
    super(props);
    this.state = this._getInitialState();
  }

  // Keep the internal `value` consistent with an outside `value` if present.
  // This basically allows the slider to be a controlled component.
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
  // TODO: better name? better solution?
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

  _getMousePosition= (e) => {
    return [
      e[`page${this._axisKey()}`],
      e[`page${this._orthogonalAxisKey()}`],
    ];
  }

  _getTouchPosition = (e) => {
    const [touch] = e.touches;
    return [
      touch[`page${this._axisKey()}`],
      touch[`page${this._orthogonalAxisKey()}`],
    ];
  }

  _getMouseEventMap = () => {
    return [
      ['mousemove', this._onMouseMove],
      ['mouseup', this._onMouseUp],
    ];
  }

  _getTouchEventMap = () => {
    return [
      ['touchmove', this._onTouchMove],
      ['touchend', this._onTouchEnd],
    ];
  }

  // create the `mousedown` handler for the i-th handle
  _createOnMouseDown = (i) => {
    return e => {
      const [position] = this._getMousePosition(e);
      this._onStart(i, position);
      this._addHandlers(this._getMouseEventMap());

      pauseEvent(e);
    };
  }

  // create the `touchstart` handler for the i-th handle
  _createOnTouchStart = (i) => {
    return e => {
      if (e.touches.length > 1) return;

      const positions = this._getTouchPosition(e);
      const [position] = positions;

      this.startPosition = positions;
      this.isScrolling = undefined; // don't know yet if the user is trying to scroll

      this._onStart(i, position);
      this._addHandlers(this._getTouchEventMap());

      stopPropagation(e);
    };
  }

  _addHandlers = (eventMap) => {
    for (let [key, func] of eventMap) {
      document.addEventListener(key, func, false);
    }
  }

  _removeHandlers = (eventMap) => {
    for (let [key, func] of eventMap) {
      document.removeEventListener(key, func, false);
    }
  }

  _takeMeasurements = () => {
    const {invert} = this.props;
    const {slider} = this.refs;

    const sizeKey = this._sizeKey();
    const directionKey = this._directionKey();

    const sliderNode = slider.getDOMNode();
    const sliderMin = sliderNode[`offset${directionKey}`] + sliderNode[`client${directionKey}`];
    const sliderMax = sliderMin + sliderNode[sizeKey];

    this.sliderStart = invert ? sliderMax : sliderMin;
    this.sliderLength = Math.abs(sliderMax - sliderMin);
  }

  _onStart = (index, startPosition) => {
    const {zIndices, value} = this.state;

    this._takeMeasurements();

    // if activeElement is body window will lost focus in IE9
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    this.hasMoved = false;

    this._fireChangeEvent('onBeforeChange');

    zIndices.splice(zIndices.indexOf(index), 1); // remove wherever the element is
    zIndices.push(index); // add to end

    this.setState({
      index,
      zIndices,
      startPosition,
      startValue: value[index],
    });
  }

  _onMouseUp = () => {
    this._onEnd(this._getMouseEventMap());
  }

  _onTouchEnd = () => {
    this._onEnd(this._getTouchEventMap());
  }

  _onEnd = (eventMap) => {
    this._removeHandlers(eventMap);
    this.setState({index: -1}, () => this._fireChangeEvent('onAfterChange'));
  }

  _onMouseMove = (e) => {
    const [position] = this._getMousePosition(e);
    this._onMove(position);
  }

  _onTouchMove = (e) => {
    if (e.touches.length > 1) return;

    const [positionMainDir, positionScrollDir] = this._getTouchPosition(e);
    const [startPositionMainDir, startPositionScrollDir] = this.startPosition;

    if (typeof this.isScrolling === 'undefined') {
      const diffMainDir = positionMainDir - startPositionMainDir;
      const diffScrollDir = positionScrollDir - startPositionScrollDir;
      this.isScrolling = Math.abs(diffScrollDir) > Math.abs(diffMainDir);
    }

    if (this.isScrolling) {
      this.setState({index: -1});
      return;
    }

    pauseEvent(e);

    this._onMove(positionMainDir);
  }

  _onMove = (position) => {
    const {props, state, sliderLength} = this;
    const {min, max, invert} = props;
    const {startPosition, startValue} = state;

    this.hasMoved = true;

    let diffPosition = position - startPosition;
    if (invert) diffPosition *= -1;

    const diffValue = diffPosition / sliderLength * (max - min);

    this._move(startValue + diffValue);
  }

  _move = (toValue) => {
    const {props, state} = this;
    const {min, max, minDistance, pearling, disabled} = props;
    const {index, value} = state;

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

  _onFocus = (index) => {
    this.setState({index});
  }

  _onBlur = () => {
    this.setState({index: -1});
  }

  _onKeyDown = ({which, shiftKey}) => {
    const {step} = this.props;
    const {value, index} = this.state;

    if (which === RIGHT_KEY) {
      this._move(value[index] + (step * shiftKey ? SHIFT_MULTIPLIER : 1));
    } else if (which === LEFT_KEY) {
      this._move(value[index] - (step * shiftKey ? SHIFT_MULTIPLIER : 1));
    }
  }

  _renderHandles = () => {
    const {min, max, handleClassName, handleActiveClassName, disabled, children} = this.props;
    const {value, index, zIndices} = this.state;

    return (
      <Handles
        value={value}
        index={index}
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
    const {value, index} = this.state;

    return (
      <Bars
        value={value}
        index={index}
        min={min}
        max={max}
        barClassName={barClassName}
        />
    );
  }

  _onSliderMouseDown = (e) => {
    const {snapDragDisabled} = this.props;

    this.hasMoved = false;

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

  _onSliderClick = (e) => {
    const {onSliderClick} = this.props;

    if (onSliderClick && !this.hasMoved) {
      this._takeMeasurements();

      const [position] = this._getMousePosition(e);
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

  render() {
    const {className, style, disabled, withBars, withoutInputFields} = this.props;

    const newClassName = className + (disabled ? ' disabled' : '');
    const newStyle = {...style, position: 'relative'};

    const bars = withBars ? this._renderBars() : null;
    const handles = this._renderHandles();
    const inputFields = withoutInputFields ? null : this._renderInputFields();

    return (
      <span>
        <div
          ref="slider"
          className={newClassName}
          style={newStyle}
          onMouseDown={disabled ? null : this._onSliderMouseDown}
          onClick={disabled ? null : this._onSliderClick}
          >
          {bars}
          {handles}
        </div>
        {inputFields}
      </span>
    );
  }
}

export default MultiSlider;
