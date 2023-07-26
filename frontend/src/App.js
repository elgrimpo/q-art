import {Button, Card, CardMedia} from "@mui/material"
import './App.css';
import axios from 'axios'
import { useState } from 'react';


function App() {

  const [image, setImage] = useState();

  const tester = () => {
    axios.get('http://localhost:8000/test')
      .then(res => {

      })
      .catch(err => {

      })
  }

  const generate = async () => {
    axios.get('http://localhost:8000/generate')
      .then(res => {
        const data = res.data;
        setImage(res.data);

      })
      .catch(err => {
        console.log(err);
      })

  }
  return (
    <div className="App">
      <header className="App-header">
      <Button variant="contained" onClick={generate}>Generate Image</Button>
      <Card>
      <CardMedia 
        component="img"
        height="320"
        image={`data:image/png;base64,${image}`} />
      </Card>
      </header>
    </div>
  );
}

export default App;
