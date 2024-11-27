$(function () {
    let blockCounter = 0; // counter to assign unique IDs to blocks

    // add a new block to the editor
    $("#add-block").click(function () {
        const blockId = `block-${blockCounter++}`;
        const block = $("<div></div>")
            .addClass('block')
            .attr("id", blockId)
            .css({ top: "10px", left: "10px" })
            .appendTo("#editor");

        // Make the block draggable within the editor
        block.draggable({
            containment: "#editor",
            stop: function (event, ui) {
                // handle stop event if needed
            }
        });

        // prevent event propagation on block click
        block.click(function (event) {
            event.stopPropagation();
        });

        //  right-click to delete the block
        block.on("contextmenu", function (event) {
            event.preventDefault();
            if (confirm("Delete this block?")) {
                block.remove();
            }
        });
    });

    // Load the list of levels from the server
    function loadLevelList() {
        $.ajax({
            url: "http://localhost:3000/levels",
            method: "GET",
            success: function (levelIds) {
                const $levelList = $("#level-list");
                $levelList.empty();
                $levelList.append('<option value="">Select a Level</option>');
                levelIds.forEach(function (id) {
                    $levelList.append(`<option value="${id}">${id}</option>`);
                });
            },
            error: function (xhr, status, error) {
                console.error("Error fetching level list: ", error);
            }
        });
    }

    // Save the current level to the server
    $("#save-level").click(function () {
        const levelId = $("#level-id").val().trim();
        if (!levelId) {
            alert("Please enter a level ID.");
            return;
        }

        const levelData = [];

        // collect data for each block in the editor
        $(".block").each(function () {
            const $this = $(this);
            const position = $this.position();
            levelData.push({
                id: $this.attr("id"),
                x: position.left,
                y: position.top,
                width: $this.width(),
                height: $this.height(),
                type: "block"
            });
        });

        if (levelData.length === 0) {
            alert("Please add at least one block to the level");
            return;
        }

        // Send the level data to the server
        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(levelData),
            success: function (response) {
                alert(response);
                loadLevelList();
            },
            error: function (xhr, status, error) {
                alert("Error saving level: " + xhr.responseText);
            }
        });
    });

    // Load a selected level from the server
    $("#load-level").click(function () {
        const levelId = $("#level-list").val();
        if (!levelId) {
            alert("Please select a level to load.");
            return;
        }

        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "GET",
            success: function (levelData) {
                $("#editor").empty(); // Clear the editor
                levelData.forEach(function (blockData) {
                    const block = $("<div></div>")
                        .addClass('block')
                        .attr("id", blockData.id)
                        .css({
                            top: blockData.y + "px",
                            left: blockData.x + "px",
                            width: blockData.width + "px",
                            height: blockData.height + "px"
                        })
                        .appendTo("#editor");

                    // Make the loaded block draggable
                    block.draggable({
                        containment: "#editor",
                        stop: function (event, ui) {
                            // handle stop event if needed
                        }
                    });

                    // prevent event propagation on block click
                    block.click(function (event) {
                        event.stopPropagation();
                    });

                    // Handle right-click to delete the block
                    block.on("contextmenu", function (event) {
                        event.preventDefault();
                        if (confirm("Delete this block?")) {
                            block.remove();
                        }
                    });
                });
            },
            error: function (xhr, status, error) {
                alert("Error loading level: " + xhr.responseText);
            }
        });
    });

    // Load the list of levels when the page is ready
    loadLevelList();
});