#!/bin/bash

echo "Installing dependencies..."

npm install --save-dev \
  eslint \
  @react-native-community/eslint-config \
  jest \
  @types/jest \
  ts-jest \
  typescript

echo "✅ Dev dependencies installed."
