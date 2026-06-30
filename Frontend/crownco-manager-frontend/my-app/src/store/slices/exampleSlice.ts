import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  value: number;
  message: string;
}

const initialState: ExampleState = {
  value: 0,
  message: 'Hello from Redux Toolkit!',
};

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    reset: (state) => {
      state.value = initialState.value;
      state.message = initialState.message;
    },
  },
});

export const { increment, decrement, incrementByAmount, setMessage, reset } =
  exampleSlice.actions;
export default exampleSlice.reducer;

