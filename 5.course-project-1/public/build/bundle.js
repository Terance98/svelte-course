
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/UI/Header.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/UI/Header.svelte";

    function create_fragment$5(ctx) {
    	let header;
    	let h1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "MeetUs";
    			attr_dev(h1, "class", "svelte-umcwna");
    			add_location(h1, file$5, 4, 2, 31);
    			attr_dev(header, "class", "svelte-umcwna");
    			add_location(header, file$5, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/UI/Button.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/UI/Button.svelte";

    // (7:0) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*caption*/ ctx[1]);
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*mode*/ ctx[3]) + " svelte-g32zaw"));
    			attr_dev(button, "type", /*type*/ ctx[0]);
    			add_location(button, file$4, 7, 2, 106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev(t, /*caption*/ ctx[1]);

    			if (dirty & /*mode*/ 8 && button_class_value !== (button_class_value = "" + (null_to_empty(/*mode*/ ctx[3]) + " svelte-g32zaw"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*type*/ 1) {
    				attr_dev(button, "type", /*type*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(7:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (5:0) {#if href}
    function create_if_block$1(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(/*caption*/ ctx[1]);
    			attr_dev(a, "href", /*href*/ ctx[2]);
    			attr_dev(a, "class", "svelte-g32zaw");
    			add_location(a, file$4, 5, 2, 72);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev(t, /*caption*/ ctx[1]);

    			if (dirty & /*href*/ 4) {
    				attr_dev(a, "href", /*href*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(5:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[2]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, []);
    	let { type, caption, href, mode } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (type === undefined && !('type' in $$props || $$self.$$.bound[$$self.$$.props['type']])) {
    			console.warn("<Button> was created without expected prop 'type'");
    		}

    		if (caption === undefined && !('caption' in $$props || $$self.$$.bound[$$self.$$.props['caption']])) {
    			console.warn("<Button> was created without expected prop 'caption'");
    		}

    		if (href === undefined && !('href' in $$props || $$self.$$.bound[$$self.$$.props['href']])) {
    			console.warn("<Button> was created without expected prop 'href'");
    		}

    		if (mode === undefined && !('mode' in $$props || $$self.$$.bound[$$self.$$.props['mode']])) {
    			console.warn("<Button> was created without expected prop 'mode'");
    		}
    	});

    	const writable_props = ['type', 'caption', 'href', 'mode'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('caption' in $$props) $$invalidate(1, caption = $$props.caption);
    		if ('href' in $$props) $$invalidate(2, href = $$props.href);
    		if ('mode' in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	$$self.$capture_state = () => ({ type, caption, href, mode });

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('caption' in $$props) $$invalidate(1, caption = $$props.caption);
    		if ('href' in $$props) $$invalidate(2, href = $$props.href);
    		if ('mode' in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, caption, href, mode];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { type: 0, caption: 1, href: 2, mode: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get caption() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set caption(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Meetups/MeetupItem.svelte generated by Svelte v3.59.2 */
    const file$3 = "src/Meetups/MeetupItem.svelte";

    function create_fragment$3(ctx) {
    	let article;
    	let header;
    	let h1;
    	let t0;
    	let t1;
    	let h2;
    	let t2;
    	let t3;
    	let p0;
    	let t4;
    	let t5;
    	let div0;
    	let img;
    	let img_src_value;
    	let t6;
    	let div1;
    	let p1;
    	let t7;
    	let t8;
    	let footer;
    	let button0;
    	let t9;
    	let button1;
    	let t10;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				href: "mailto:" + /*email*/ ctx[5],
    				caption: "Contact"
    			},
    			$$inline: true
    		});

    	button1 = new Button({
    			props: {
    				mode: "outline",
    				type: "button",
    				caption: "Show Details"
    			},
    			$$inline: true
    		});

    	button2 = new Button({
    			props: { type: "button", caption: "Favorite" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			article = element("article");
    			header = element("header");
    			h1 = element("h1");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			h2 = element("h2");
    			t2 = text(/*subtitle*/ ctx[1]);
    			t3 = space();
    			p0 = element("p");
    			t4 = text(/*address*/ ctx[4]);
    			t5 = space();
    			div0 = element("div");
    			img = element("img");
    			t6 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t7 = text(/*description*/ ctx[3]);
    			t8 = space();
    			footer = element("footer");
    			create_component(button0.$$.fragment);
    			t9 = space();
    			create_component(button1.$$.fragment);
    			t10 = space();
    			create_component(button2.$$.fragment);
    			attr_dev(h1, "class", "svelte-enhpap");
    			add_location(h1, file$3, 7, 4, 158);
    			attr_dev(h2, "class", "svelte-enhpap");
    			add_location(h2, file$3, 8, 4, 179);
    			attr_dev(p0, "class", "svelte-enhpap");
    			add_location(p0, file$3, 9, 4, 203);
    			attr_dev(header, "class", "svelte-enhpap");
    			add_location(header, file$3, 6, 2, 145);
    			if (!src_url_equal(img.src, img_src_value = /*imageUrl*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-enhpap");
    			add_location(img, file$3, 12, 4, 258);
    			attr_dev(div0, "class", "image svelte-enhpap");
    			add_location(div0, file$3, 11, 2, 234);
    			attr_dev(p1, "class", "svelte-enhpap");
    			add_location(p1, file$3, 15, 4, 325);
    			attr_dev(div1, "class", "content svelte-enhpap");
    			add_location(div1, file$3, 14, 2, 299);
    			attr_dev(footer, "class", "svelte-enhpap");
    			add_location(footer, file$3, 17, 2, 357);
    			attr_dev(article, "class", "svelte-enhpap");
    			add_location(article, file$3, 5, 0, 133);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, header);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(header, t1);
    			append_dev(header, h2);
    			append_dev(h2, t2);
    			append_dev(header, t3);
    			append_dev(header, p0);
    			append_dev(p0, t4);
    			append_dev(article, t5);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(article, t6);
    			append_dev(article, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t7);
    			append_dev(article, t8);
    			append_dev(article, footer);
    			mount_component(button0, footer, null);
    			append_dev(footer, t9);
    			mount_component(button1, footer, null);
    			append_dev(footer, t10);
    			mount_component(button2, footer, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (!current || dirty & /*subtitle*/ 2) set_data_dev(t2, /*subtitle*/ ctx[1]);
    			if (!current || dirty & /*address*/ 16) set_data_dev(t4, /*address*/ ctx[4]);

    			if (!current || dirty & /*imageUrl*/ 4 && !src_url_equal(img.src, img_src_value = /*imageUrl*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*description*/ 8) set_data_dev(t7, /*description*/ ctx[3]);
    			const button0_changes = {};
    			if (dirty & /*email*/ 32) button0_changes.href = "mailto:" + /*email*/ ctx[5];
    			button0.$set(button0_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(button2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MeetupItem', slots, []);
    	let { title, subtitle, imageUrl, description, address, email } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (title === undefined && !('title' in $$props || $$self.$$.bound[$$self.$$.props['title']])) {
    			console.warn("<MeetupItem> was created without expected prop 'title'");
    		}

    		if (subtitle === undefined && !('subtitle' in $$props || $$self.$$.bound[$$self.$$.props['subtitle']])) {
    			console.warn("<MeetupItem> was created without expected prop 'subtitle'");
    		}

    		if (imageUrl === undefined && !('imageUrl' in $$props || $$self.$$.bound[$$self.$$.props['imageUrl']])) {
    			console.warn("<MeetupItem> was created without expected prop 'imageUrl'");
    		}

    		if (description === undefined && !('description' in $$props || $$self.$$.bound[$$self.$$.props['description']])) {
    			console.warn("<MeetupItem> was created without expected prop 'description'");
    		}

    		if (address === undefined && !('address' in $$props || $$self.$$.bound[$$self.$$.props['address']])) {
    			console.warn("<MeetupItem> was created without expected prop 'address'");
    		}

    		if (email === undefined && !('email' in $$props || $$self.$$.bound[$$self.$$.props['email']])) {
    			console.warn("<MeetupItem> was created without expected prop 'email'");
    		}
    	});

    	const writable_props = ['title', 'subtitle', 'imageUrl', 'description', 'address', 'email'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MeetupItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(1, subtitle = $$props.subtitle);
    		if ('imageUrl' in $$props) $$invalidate(2, imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate(3, description = $$props.description);
    		if ('address' in $$props) $$invalidate(4, address = $$props.address);
    		if ('email' in $$props) $$invalidate(5, email = $$props.email);
    	};

    	$$self.$capture_state = () => ({
    		Button,
    		title,
    		subtitle,
    		imageUrl,
    		description,
    		address,
    		email
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(1, subtitle = $$props.subtitle);
    		if ('imageUrl' in $$props) $$invalidate(2, imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate(3, description = $$props.description);
    		if ('address' in $$props) $$invalidate(4, address = $$props.address);
    		if ('email' in $$props) $$invalidate(5, email = $$props.email);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, subtitle, imageUrl, description, address, email];
    }

    class MeetupItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			title: 0,
    			subtitle: 1,
    			imageUrl: 2,
    			description: 3,
    			address: 4,
    			email: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupItem",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get title() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitle() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitle(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageUrl() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageUrl(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get address() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set address(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get email() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set email(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Meetups/MeetupGrid.svelte generated by Svelte v3.59.2 */
    const file$2 = "src/Meetups/MeetupGrid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (8:2) {#each meetUps as meetup (meetup.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let meetupitem;
    	let current;

    	meetupitem = new MeetupItem({
    			props: {
    				title: /*meetup*/ ctx[1].title,
    				subtitle: /*meetup*/ ctx[1].subtitle,
    				imageUrl: /*meetup*/ ctx[1].imageUrl,
    				description: /*meetup*/ ctx[1].description,
    				email: /*meetup*/ ctx[1].contactEmail,
    				address: /*meetup*/ ctx[1].address
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(meetupitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(meetupitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const meetupitem_changes = {};
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.title = /*meetup*/ ctx[1].title;
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.subtitle = /*meetup*/ ctx[1].subtitle;
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.imageUrl = /*meetup*/ ctx[1].imageUrl;
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.description = /*meetup*/ ctx[1].description;
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.email = /*meetup*/ ctx[1].contactEmail;
    			if (dirty & /*meetUps*/ 1) meetupitem_changes.address = /*meetup*/ ctx[1].address;
    			meetupitem.$set(meetupitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(meetupitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(meetupitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(meetupitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(8:2) {#each meetUps as meetup (meetup.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*meetUps*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*meetup*/ ctx[1].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(section, "id", "meetups");
    			attr_dev(section, "class", "svelte-181fmcx");
    			add_location(section, file$2, 6, 0, 91);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(section, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*meetUps*/ 1) {
    				each_value = /*meetUps*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, section, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MeetupGrid', slots, []);
    	let { meetUps } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (meetUps === undefined && !('meetUps' in $$props || $$self.$$.bound[$$self.$$.props['meetUps']])) {
    			console.warn("<MeetupGrid> was created without expected prop 'meetUps'");
    		}
    	});

    	const writable_props = ['meetUps'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MeetupGrid> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('meetUps' in $$props) $$invalidate(0, meetUps = $$props.meetUps);
    	};

    	$$self.$capture_state = () => ({ MeetupItem, meetUps });

    	$$self.$inject_state = $$props => {
    		if ('meetUps' in $$props) $$invalidate(0, meetUps = $$props.meetUps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [meetUps];
    }

    class MeetupGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { meetUps: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupGrid",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get meetUps() {
    		throw new Error("<MeetupGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set meetUps(value) {
    		throw new Error("<MeetupGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/TextInput.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/UI/TextInput.svelte";

    // (15:2) {:else}
    function create_else_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", /*type*/ ctx[5]);
    			attr_dev(input, "id", /*id*/ ctx[1]);
    			input.value = /*value*/ ctx[3];
    			attr_dev(input, "class", "svelte-xzzzlr");
    			add_location(input, file$1, 15, 4, 552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_handler_1*/ ctx[7], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 32) {
    				attr_dev(input, "type", /*type*/ ctx[5]);
    			}

    			if (dirty & /*id*/ 2) {
    				attr_dev(input, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 8 && input.value !== /*value*/ ctx[3]) {
    				prop_dev(input, "value", /*value*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(15:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (13:2) {#if controlType === "textarea"}
    function create_if_block(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "rows", /*rows*/ ctx[4]);
    			attr_dev(textarea, "id", /*id*/ ctx[1]);
    			textarea.value = /*value*/ ctx[3];
    			attr_dev(textarea, "class", "svelte-xzzzlr");
    			add_location(textarea, file$1, 13, 4, 496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*input_handler*/ ctx[6], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 16) {
    				attr_dev(textarea, "rows", /*rows*/ ctx[4]);
    			}

    			if (dirty & /*id*/ 2) {
    				attr_dev(textarea, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 8) {
    				prop_dev(textarea, "value", /*value*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(13:2) {#if controlType === \\\"textarea\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let label_1;
    	let t0;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*controlType*/ ctx[0] === "textarea") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[2]);
    			t1 = space();
    			if_block.c();
    			attr_dev(label_1, "for", /*id*/ ctx[1]);
    			attr_dev(label_1, "class", "svelte-xzzzlr");
    			add_location(label_1, file$1, 11, 2, 425);
    			attr_dev(div, "class", "form-control svelte-xzzzlr");
    			add_location(div, file$1, 10, 0, 396);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 4) set_data_dev(t0, /*label*/ ctx[2]);

    			if (dirty & /*id*/ 2) {
    				attr_dev(label_1, "for", /*id*/ ctx[1]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextInput', slots, []);
    	let { controlType, id, label, value, rows, type } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (controlType === undefined && !('controlType' in $$props || $$self.$$.bound[$$self.$$.props['controlType']])) {
    			console.warn("<TextInput> was created without expected prop 'controlType'");
    		}

    		if (id === undefined && !('id' in $$props || $$self.$$.bound[$$self.$$.props['id']])) {
    			console.warn("<TextInput> was created without expected prop 'id'");
    		}

    		if (label === undefined && !('label' in $$props || $$self.$$.bound[$$self.$$.props['label']])) {
    			console.warn("<TextInput> was created without expected prop 'label'");
    		}

    		if (value === undefined && !('value' in $$props || $$self.$$.bound[$$self.$$.props['value']])) {
    			console.warn("<TextInput> was created without expected prop 'value'");
    		}

    		if (rows === undefined && !('rows' in $$props || $$self.$$.bound[$$self.$$.props['rows']])) {
    			console.warn("<TextInput> was created without expected prop 'rows'");
    		}

    		if (type === undefined && !('type' in $$props || $$self.$$.bound[$$self.$$.props['type']])) {
    			console.warn("<TextInput> was created without expected prop 'type'");
    		}
    	});

    	const writable_props = ['controlType', 'id', 'label', 'value', 'rows', 'type'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('controlType' in $$props) $$invalidate(0, controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate(1, id = $$props.id);
    		if ('label' in $$props) $$invalidate(2, label = $$props.label);
    		if ('value' in $$props) $$invalidate(3, value = $$props.value);
    		if ('rows' in $$props) $$invalidate(4, rows = $$props.rows);
    		if ('type' in $$props) $$invalidate(5, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({
    		controlType,
    		id,
    		label,
    		value,
    		rows,
    		type
    	});

    	$$self.$inject_state = $$props => {
    		if ('controlType' in $$props) $$invalidate(0, controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate(1, id = $$props.id);
    		if ('label' in $$props) $$invalidate(2, label = $$props.label);
    		if ('value' in $$props) $$invalidate(3, value = $$props.value);
    		if ('rows' in $$props) $$invalidate(4, rows = $$props.rows);
    		if ('type' in $$props) $$invalidate(5, type = $$props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [controlType, id, label, value, rows, type, input_handler, input_handler_1];
    }

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			controlType: 0,
    			id: 1,
    			label: 2,
    			value: 3,
    			rows: 4,
    			type: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let header;
    	let t0;
    	let main;
    	let form;
    	let textinput0;
    	let t1;
    	let textinput1;
    	let t2;
    	let textinput2;
    	let t3;
    	let textinput3;
    	let t4;
    	let textinput4;
    	let t5;
    	let textinput5;
    	let t6;
    	let button;
    	let t7;
    	let meetupgrid;
    	let current;
    	let mounted;
    	let dispose;
    	header = new Header({ $$inline: true });

    	textinput0 = new TextInput({
    			props: {
    				id: "title",
    				label: "Title",
    				type: "text",
    				value: /*title*/ ctx[0]
    			},
    			$$inline: true
    		});

    	textinput0.$on("input", /*input_handler*/ ctx[8]);

    	textinput1 = new TextInput({
    			props: {
    				id: "subtitle",
    				label: "Subtitle",
    				type: "text",
    				value: /*subtitle*/ ctx[1]
    			},
    			$$inline: true
    		});

    	textinput1.$on("input", /*input_handler_1*/ ctx[9]);

    	textinput2 = new TextInput({
    			props: {
    				id: "address",
    				label: "Address",
    				type: "text",
    				value: /*address*/ ctx[4]
    			},
    			$$inline: true
    		});

    	textinput2.$on("input", /*input_handler_2*/ ctx[10]);

    	textinput3 = new TextInput({
    			props: {
    				id: "imageUrl",
    				label: "Image URL",
    				type: "text",
    				value: /*imageUrl*/ ctx[2]
    			},
    			$$inline: true
    		});

    	textinput3.$on("input", /*input_handler_3*/ ctx[11]);

    	textinput4 = new TextInput({
    			props: {
    				id: "email",
    				label: "Email",
    				type: "email",
    				value: /*email*/ ctx[5]
    			},
    			$$inline: true
    		});

    	textinput4.$on("input", /*input_handler_4*/ ctx[12]);

    	textinput5 = new TextInput({
    			props: {
    				id: "description",
    				label: "Description",
    				controlType: "textarea",
    				value: /*description*/ ctx[3],
    				rows: "3"
    			},
    			$$inline: true
    		});

    	textinput5.$on("input", /*input_handler_5*/ ctx[13]);

    	button = new Button({
    			props: { type: "submit", caption: "Save" },
    			$$inline: true
    		});

    	meetupgrid = new MeetupGrid({
    			props: { meetUps: /*meetUps*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			main = element("main");
    			form = element("form");
    			create_component(textinput0.$$.fragment);
    			t1 = space();
    			create_component(textinput1.$$.fragment);
    			t2 = space();
    			create_component(textinput2.$$.fragment);
    			t3 = space();
    			create_component(textinput3.$$.fragment);
    			t4 = space();
    			create_component(textinput4.$$.fragment);
    			t5 = space();
    			create_component(textinput5.$$.fragment);
    			t6 = space();
    			create_component(button.$$.fragment);
    			t7 = space();
    			create_component(meetupgrid.$$.fragment);
    			attr_dev(form, "class", "svelte-14fgpj0");
    			add_location(form, file, 67, 2, 1901);
    			attr_dev(main, "class", "svelte-14fgpj0");
    			add_location(main, file, 66, 0, 1892);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			mount_component(textinput0, form, null);
    			append_dev(form, t1);
    			mount_component(textinput1, form, null);
    			append_dev(form, t2);
    			mount_component(textinput2, form, null);
    			append_dev(form, t3);
    			mount_component(textinput3, form, null);
    			append_dev(form, t4);
    			mount_component(textinput4, form, null);
    			append_dev(form, t5);
    			mount_component(textinput5, form, null);
    			append_dev(form, t6);
    			mount_component(button, form, null);
    			append_dev(main, t7);
    			mount_component(meetupgrid, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", prevent_default(/*addMeetup*/ ctx[7]), false, true, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const textinput0_changes = {};
    			if (dirty & /*title*/ 1) textinput0_changes.value = /*title*/ ctx[0];
    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};
    			if (dirty & /*subtitle*/ 2) textinput1_changes.value = /*subtitle*/ ctx[1];
    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};
    			if (dirty & /*address*/ 16) textinput2_changes.value = /*address*/ ctx[4];
    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*imageUrl*/ 4) textinput3_changes.value = /*imageUrl*/ ctx[2];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};
    			if (dirty & /*email*/ 32) textinput4_changes.value = /*email*/ ctx[5];
    			textinput4.$set(textinput4_changes);
    			const textinput5_changes = {};
    			if (dirty & /*description*/ 8) textinput5_changes.value = /*description*/ ctx[3];
    			textinput5.$set(textinput5_changes);
    			const meetupgrid_changes = {};
    			if (dirty & /*meetUps*/ 64) meetupgrid_changes.meetUps = /*meetUps*/ ctx[6];
    			meetupgrid.$set(meetupgrid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			transition_in(textinput5.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			transition_in(meetupgrid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(meetupgrid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(textinput0);
    			destroy_component(textinput1);
    			destroy_component(textinput2);
    			destroy_component(textinput3);
    			destroy_component(textinput4);
    			destroy_component(textinput5);
    			destroy_component(button);
    			destroy_component(meetupgrid);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let title = "";
    	let subtitle = "";
    	let imageUrl = "";
    	let description = "";
    	let address = "";
    	let email = "";

    	let meetUps = [
    		{
    			id: "m1",
    			title: "Coding Bootcamp",
    			subtitle: "Learn to code in 2 hours",
    			description: "In this meetup, we will have some experts that will teach you how to code",
    			imageUrl: "https://cdn.pixabay.com/photo/2018/06/08/00/48/developer-3461405_1280.png",
    			address: "27th street, kerala",
    			contactEmail: "test@123.com"
    		},
    		{
    			id: "m2",
    			title: "Web Development Workshop",
    			subtitle: "Master the art of building websites",
    			description: "Join us for an intensive workshop on web development, covering HTML, CSS, and JavaScript.",
    			imageUrl: "https://cdn.pixabay.com/photo/2018/12/10/02/14/manhattan-3866140_640.jpg",
    			address: "123 Main Street, Tech City",
    			contactEmail: "workshop@example.com"
    		},
    		{
    			id: "m3",
    			title: "Data Science Meetup",
    			subtitle: "Explore the world of data and analytics",
    			description: "Connect with data science enthusiasts and professionals. Dive into the latest trends and technologies in data science.",
    			imageUrl: "https://cdn.pixabay.com/photo/2013/07/18/09/12/woman-163426_640.jpg",
    			address: "42 Data Way, Analyticsville",
    			contactEmail: "datascience@example.com"
    		}
    	];

    	function addMeetup() {
    		const newMeetup = {
    			id: Math.random().toString(),
    			title,
    			subtitle,
    			imageUrl,
    			description,
    			address,
    			contactEmail: email
    		};

    		$$invalidate(6, meetUps = [newMeetup, ...meetUps]);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const input_handler = event => $$invalidate(0, title = event.target.value);
    	const input_handler_1 = event => $$invalidate(1, subtitle = event.target.value);
    	const input_handler_2 = event => $$invalidate(4, address = event.target.value);
    	const input_handler_3 = event => $$invalidate(2, imageUrl = event.target.value);
    	const input_handler_4 = event => $$invalidate(5, email = event.target.value);
    	const input_handler_5 = event => $$invalidate(3, description = event.target.value);

    	$$self.$capture_state = () => ({
    		Header,
    		MeetupGrid,
    		TextInput,
    		Button,
    		title,
    		subtitle,
    		imageUrl,
    		description,
    		address,
    		email,
    		meetUps,
    		addMeetup
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate(1, subtitle = $$props.subtitle);
    		if ('imageUrl' in $$props) $$invalidate(2, imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate(3, description = $$props.description);
    		if ('address' in $$props) $$invalidate(4, address = $$props.address);
    		if ('email' in $$props) $$invalidate(5, email = $$props.email);
    		if ('meetUps' in $$props) $$invalidate(6, meetUps = $$props.meetUps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		title,
    		subtitle,
    		imageUrl,
    		description,
    		address,
    		email,
    		meetUps,
    		addMeetup,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		input_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
