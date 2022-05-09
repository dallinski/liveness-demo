import React from 'react'

import './index.css'

import {LivenessDemo} from "./liveness";
import {createRoot} from "react-dom/client";

const container = document.getElementById('app-root');
const root = createRoot(container!);
root.render(<LivenessDemo/>);
