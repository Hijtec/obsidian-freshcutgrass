try {
	if (!property) return '';

	function esc(s) {
		if (s === null || s === undefined) return '';
		return String(s).replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function renderCostIcons(cost) {
		var out = '';
		if (!cost) return out;
		if (cost.stress != null) {
			out += '<div class="fcg-icon fcg-icon-stress" aria-label="' + esc(cost.stress) + ' Stress"></div>';
		}
		if (cost.fear != null) {
			out += '<div class="fcg-icon fcg-icon-fear" aria-label="' + esc(cost.fear) + ' Fear"></div>';
		}
		if (cost.hitPoints != null) {
			out += '<div class="fcg-icon fcg-icon-hp" aria-label="' + esc(cost.hitPoints) + ' HP"></div>';
		}
		return out;
	}

	function renderActionTypeIcon(actionType) {
		var out = '';
		if (!actionType) return out;
		if (actionType.toLowerCase() === 'action') {
			out += '<div class="fcg-icon fcg-icon-action" aria-label="Action"></div>';
		} else if (actionType.toLowerCase() === 'reaction') {
			out += '<div class="fcg-icon fcg-icon-reaction" aria-label="Reaction"></div>';
		} else if (actionType.toLowerCase() === 'passive') {
			out += '<div class="fcg-icon fcg-icon-passive" aria-label="Passive"></div>';
		}
		return out;
	}


	function renderFeatureHeaderLeft(f) {
		var nameHtml = '<span class="fgc-feature-header-name">' + esc(f.name || '') + '</span>';
		var valueHtml = (f.value !== undefined && f.value !== null) ? '<span class="fgc-feature-header-value">(' + esc(f.value) + ')</span>' : '';
		var typeHtml = f.type ? '<span class="fgc-feature-header-type">' + esc(f.type) + '</span>' : '';
		var separatorHtml = '<span class="fgc-feature-header-separator">&nbsp;-&nbsp;</span>';

		var inner = '<div class="fgc-feature-header-left">';
		inner += nameHtml + '&nbsp;';
		if (valueHtml) inner += valueHtml;
		if (typeHtml) inner += separatorHtml + typeHtml;
		inner += '</div>';

		return inner;
	}

	function renderFeatureHeaderRight(f) {
		var costHtml = '';
		if (f.cost) {
			var parts = [];
			if (f.cost.stress != null) parts.push('stress');
			if (f.cost.fear != null) parts.push('fear');
			if (f.cost.hitPoints != null) parts.push('hitPoints');
			costHtml = renderCostIcons(f.cost);
		}

		var actionTypeHtml = '';
		if (f.actionType) {
			actionTypeHtml = renderActionTypeIcon(f.actionType);
		}

		var inner = '<div class="fgc-feature-header-right">';
		inner += costHtml;
		inner += actionTypeHtml;
		inner += '</div>';

		return inner;
	}

	function renderFeatureBody(f) {
		var uses = (f.uses !== undefined && f.uses !== null) ? '<div class="uses">Uses: ' + esc(f.uses) + '</div>' : '';
		var desc = f.description ? '<div class="fgc-feature-description">' + esc(f.description) + '</div>' : '';
		var flavour = (f.flavourText) ? '<div class="fgc-feature-flavour"><em>' + esc(f.flavourText) + '</em></div>' : '';
		return uses + desc + flavour;
	}

	// If plugin passes the whole array
	if (Array.isArray(property)) {
		var headerHtml = renderFeatureHeaderLeft(property[0]) + renderFeatureHeaderRight(property[0]); // use first item's name/type/value for header
		var items = property.map(function (f) {
			var bodyHtml = '<div class="statblock-markdown fcg-feature-body">' + renderFeatureBody(f) + '</div>';
			return '<div class="statblock-item-container statblock-trait-prop"><div class="feature trait">' + bodyHtml + '</div></div>';
		}).join('');

		return '<div class="statblock-item-container traits-container">' + '<div class="statblock-section-heading fgc-feature-heading">' + headerHtml + '</div>' + items + '</div>';
	}

	// If plugin calls per-item, the renderer may print its own property-name; we still return
	// a property-name element in the body (so the header styling is consistent).
	var headerContent = '<div class="statblock-section-heading fgc-feature-heading">' + renderFeatureHeaderLeft(property) + renderFeatureHeaderRight(property) + '</div>';
	var bodyContent = '<div class="statblock-markdown fcg-feature-body">' + renderFeatureBody(property) + '</div>';
	return '<div class="statblock-item-container traits-container">' + headerContent + bodyContent + '</div>';
} catch (e) {
	return '';
}
