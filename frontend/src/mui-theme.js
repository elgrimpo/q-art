import { createTheme } from '@mui/material/styles';

const palette = {
    primary: {
        main:'#70E195',
        light: '#c5f2d2',
        dark: '#00ac4f'
    },
    secondary: {
        main: '#333333',
        light: '#8b8b8b',
        dark: '#000000'
    }
}


const theme = createTheme({
    palette: {
        primary: {
            main: palette.primary.main,
            light: palette.primary.light,
            dark: palette.primary.dark
        },
        secondary: {
            main: palette.secondary.main,
            light: palette.secondary.light,
            dark: palette.secondary.dark
        }

    },
    typography: {
        fontWeightMedium: 700, 
        fontWeightBold: 900,
        h5: {
            fontFamily: "Roboto Serif",
            fontWeight: 900,
            fontStyle: 'italic',
        }
      },
    components: {
        MuiTab: {
            styleOverrides: {
                root: {
                    fontFamily: "Roboto Serif",
                    fontWeight: 500,
                    fontStyle: 'italic',
                    fontSize: '1.2rem',
                    margin: '0.5rem',
                    '&.Mui-selected': {
                        
                                fontFamily: "Roboto Serif",
                                fontWeight: 900,
                                fontStyle: 'italic',   
                                color: palette.primary.dark,
                            },
                                
                        },
                    
                    }
                    
                },
                MuiTabs: {
                    styleOverrides: {
                      indicator: {
                        backgroundColor: 'rgba(0, 0, 0, 0);' 
                      }
                    }
                  }
            }
        
    

})

export default theme