async function submitData() {

    const input =
        document
        .getElementById("input")
        .value;

    const output =
        document
        .getElementById("output");

    const loading =
        document
        .getElementById("loading");

    const data =
        input
        .split("\n")
        .map(x => x.trim())
        .filter(x => x !== "");

    if(data.length === 0){

        output.textContent =
        "Please enter some relationships.";

        return;
    }

    try{

        loading.textContent =
        "Processing...";

        output.textContent = "";

        const response =
        await fetch(
            "https://bajaj-2310991249.onrender.com/bfhl",
            {
                method:"POST",
                headers:{
                    "Content-Type":
                    "application/json"
                },
                body:JSON.stringify({
                    data
                })
            }
        );

       const result = await response.json();

console.log(result);

output.textContent = JSON.stringify(
    result,
    null,
    2
);


        loading.textContent = "";

    }
    catch(error){

        loading.textContent = "";

        output.textContent =
        "API Error: " + error.message;
    }
}
