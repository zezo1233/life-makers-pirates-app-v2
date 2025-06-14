#!/bin/bash

echo "🔧 Installing dev dependencies..."

npm install --save-dev \
  eslint \
  @react-native-community/eslint-config \
  jest \
  @types/jest \
  ts-jest \
  typescript \
  jest-environment-jsdom

echo "✅ All tools installed successfully!"
