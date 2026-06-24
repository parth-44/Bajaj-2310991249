const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/bfhl", (req, res) => {
    const data = req.body.data || [];

    // ── 1. Validate ──────────────────────────────────────────────────────────
    const invalid_entries = [];
    const valid_edges = [];

    for (let edge of data) {
        edge = edge.trim();
        if (!/^[A-Z]->[A-Z]$/.test(edge) || edge[0] === edge[3]) {
            invalid_entries.push(edge);
        } else {
            valid_edges.push(edge);
        }
    }

    // ── 2. Deduplicate ────────────────────────────────────────────────────────
    const duplicate_edges = [];
    const unique_edges = [];
    const seen = new Set();

    for (let edge of valid_edges) {
        if (seen.has(edge)) {
            if (!duplicate_edges.includes(edge)) duplicate_edges.push(edge);
        } else {
            seen.add(edge);
            unique_edges.push(edge);
        }
    }

    // ── 3. Multi-parent rule (first parent wins) ──────────────────────────────
    const final_edges = [];
    const childParent = {};

    for (let edge of unique_edges) {
        const [parent, child] = edge.split("->");
        if (childParent[child]) continue;
        childParent[child] = parent;
        final_edges.push(edge);
    }

    // ── 4. Build adjacency graph ──────────────────────────────────────────────
    const graph = {};       // parent → [children]
    const allNodes = new Set();
    const childNodes = new Set();

    for (let edge of final_edges) {
        const [parent, child] = edge.split("->");
        if (!graph[parent]) graph[parent] = [];
        graph[parent].push(child);
        allNodes.add(parent);
        allNodes.add(child);
        childNodes.add(child);
    }

    // ── 5. Find connected components (union-find) ─────────────────────────────
    const parent = {};
    const find = (x) => {
        if (parent[x] === undefined) parent[x] = x;
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    };
    const union = (a, b) => { parent[find(a)] = find(b); };

    for (let edge of final_edges) {
        const [p, c] = edge.split("->");
        union(p, c);
    }

    // Group nodes by component
    const components = {};
    for (let node of allNodes) {
        const root = find(node);
        if (!components[root]) components[root] = new Set();
        components[root].add(node);
    }

    // ── 6. Cycle detection (DFS per component) ────────────────────────────────
    const hasCycleInGroup = (nodes) => {
        const visited = new Set();
        const inStack = new Set();

        const dfs = (node) => {
            visited.add(node);
            inStack.add(node);
            for (let child of (graph[node] || [])) {
                if (!visited.has(child)) {
                    if (dfs(child)) return true;
                } else if (inStack.has(child)) {
                    return true;
                }
            }
            inStack.delete(node);
            return false;
        };

        for (let node of nodes) {
            if (!visited.has(node)) {
                if (dfs(node)) return true;
            }
        }
        return false;
    };

    // ── 7. Build tree object recursively ──────────────────────────────────────
    const buildTree = (node) => {
        const obj = {};
        for (let child of (graph[node] || [])) {
            obj[child] = buildTree(child);
        }
        return obj;
    };

    // ── 8. Depth ──────────────────────────────────────────────────────────────
    const getDepth = (node) => {
        const children = graph[node] || [];
        if (children.length === 0) return 1;
        return 1 + Math.max(...children.map(getDepth));
    };

    // ── 9. Assemble hierarchies ───────────────────────────────────────────────
    const hierarchies = [];
    let largest_tree_root = "";
    let max_depth = 0;
    let total_cycles = 0;
    let total_trees = 0;

    for (let compKey of Object.keys(components)) {
        const nodes = components[compKey];
        const isCyclic = hasCycleInGroup(nodes);

        // Find root(s) for this component
        const compChildNodes = new Set();
        for (let node of nodes) {
            for (let child of (graph[node] || [])) {
                if (nodes.has(child)) compChildNodes.add(child);
            }
        }

        let roots = [...nodes].filter(n => !compChildNodes.has(n)).sort();

        // Pure cycle: no natural root → use lex smallest node
        if (roots.length === 0) {
            roots = [[...nodes].sort()[0]];
        }

        if (isCyclic) {
            total_cycles++;
            for (let root of roots) {
                hierarchies.push({ root, tree: {}, has_cycle: true });
            }
        } else {
            total_trees += roots.length;
            for (let root of roots) {
                const depth = getDepth(root);
                const hierarchy = {
                    root,
                    tree: { [root]: buildTree(root) },
                    depth
                };
                hierarchies.push(hierarchy);

                if (
                    depth > max_depth ||
                    (depth === max_depth && (largest_tree_root === "" || root < largest_tree_root))
                ) {
                    max_depth = depth;
                    largest_tree_root = root;
                }
            }
        }
    }

    res.json({
        user_id: "parthsingla_04012006",
        email_id: "parth1249.be23@chitkara.edu.in",
        college_roll_number: "2310991249",
        hierarchies,
        invalid_entries,
        duplicate_edges,
        summary: {
            total_trees,
            total_cycles,
            largest_tree_root
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
