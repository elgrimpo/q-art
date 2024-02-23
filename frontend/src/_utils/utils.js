//Libraries imports


// App imports




  /* -------------------------------------------------------------------------- */
  /*                              CALCULATE CREDITS                             */
  /* -------------------------------------------------------------------------- */

  export function calculateCredits(input) {
    // Declare credits for each service
    const priceList = {
      generate: {
        1: 1,
      },
      download: {
        false: 0,
        true: 10,
      },
      upscale: {
        0: 0,
        512: 10,
        1024: 15,
        2048: 20,
        4096: 25,
      },
    };

    let totalCredits = 0;

    Object.keys(input).forEach((service) => {
      const option = input[service];

      if (priceList[service] && typeof priceList[service][option] !== 'undefined') {
        totalCredits += priceList[service][option];
      } else {
        console.error(
          `Service '${service}' with option '${option}' not found in the price list.`
        );
      }
    });

    return totalCredits;
  }
